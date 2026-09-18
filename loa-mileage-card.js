/**
 * LOA Mileage Card
 * Carte Home Assistant pour suivre la consommation kilométrique
 * d'un contrat de Location avec Option d'Achat (LOA) / LLD,
 * à partir d'une entité odomètre.
 *
 * Config YAML :
 * type: custom:loa-mileage-card
 * entity: sensor.odometre_voiture1
 * name: Peugeot 308               # optionnel
 * icon: mdi:car                   # optionnel
 * start_date: '2024-03-15'        # date de début du contrat (YYYY-MM-DD)
 * duration_months: 48             # durée du contrat en mois
 * annual_mileage: 15000           # forfait km/an
 * initial_mileage: 12             # relevé odomètre au départ du contrat
 * cost_per_extra_km: 0.12         # optionnel, €/km de dépassement
 * warning_threshold: 5            # optionnel, points d'écart avant orange (défaut 5)
 * danger_threshold: 15            # optionnel, points d'écart avant rouge (défaut 15)
 */

class LoaMileageCard extends HTMLElement {
  setConfig(config) {
    const required = [
      "entity",
      "start_date",
      "duration_months",
      "annual_mileage",
      "initial_mileage",
    ];
    for (const key of required) {
      if (config[key] === undefined || config[key] === null || config[key] === "") {
        throw new Error(`loa-mileage-card : le champ "${key}" est obligatoire`);
      }
    }
    this._config = {
      warning_threshold: 5,
      danger_threshold: 15,
      icon: "mdi:car",
      ...config,
    };
    this._buildStaticDom();
  }

  getCardSize() {
    return 4;
  }

  static getStubConfig() {
    return {
      entity: "sensor.odometre",
      name: "Mon véhicule",
      start_date: new Date().toISOString().slice(0, 10),
      duration_months: 48,
      annual_mileage: 15000,
      initial_mileage: 0,
      cost_per_extra_km: 0.12,
    };
  }

  _buildStaticDom() {
    if (this._domBuilt) return;
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        ha-card {
          padding: 16px;
          font-family: var(--paper-font-body1_-_font-family, inherit);
        }
        .header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
        }
        .header ha-icon, .header .icon {
          --mdc-icon-size: 26px;
          color: var(--primary-color);
        }
        .header .name {
          font-size: 1.15em;
          font-weight: 600;
          color: var(--primary-text-color);
          flex: 1;
        }
        .badge {
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 0.8em;
          font-weight: 600;
          color: white;
          white-space: nowrap;
        }
        .badge.ok { background: #4caf50; }
        .badge.warning { background: #ff9800; }
        .badge.danger { background: #f44336; }
        .badge.unknown { background: #9e9e9e; }

        .big-number {
          font-size: 1.8em;
          font-weight: 700;
          color: var(--primary-text-color);
          margin-bottom: 2px;
        }
        .big-number .unit {
          font-size: 0.5em;
          font-weight: 400;
          color: var(--secondary-text-color);
          margin-left: 4px;
        }
        .sub {
          font-size: 0.85em;
          color: var(--secondary-text-color);
          margin-bottom: 16px;
        }

        .bar-row {
          margin-bottom: 12px;
        }
        .bar-label {
          display: flex;
          justify-content: space-between;
          font-size: 0.8em;
          color: var(--secondary-text-color);
          margin-bottom: 4px;
        }
        .bar-bg {
          height: 8px;
          border-radius: 4px;
          background: var(--divider-color, #e0e0e0);
          overflow: hidden;
          position: relative;
        }
        .bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.4s ease;
        }
        .bar-fill.time { background: var(--primary-color); }
        .bar-fill.mileage.ok { background: #4caf50; }
        .bar-fill.mileage.warning { background: #ff9800; }
        .bar-fill.mileage.danger { background: #f44336; }

        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px 16px;
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px solid var(--divider-color, #e0e0e0);
        }
        .stat .label {
          font-size: 0.72em;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: var(--secondary-text-color);
        }
        .stat .value {
          font-size: 1.02em;
          font-weight: 600;
          color: var(--primary-text-color);
        }
        .stat .value.negative { color: #f44336; }
        .stat .value.positive { color: #4caf50; }

        .error {
          color: #f44336;
          font-size: 0.9em;
        }
      </style>
      <ha-card>
        <div class="content"></div>
      </ha-card>
    `;
    this._content = this.shadowRoot.querySelector(".content");
    this._domBuilt = true;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    this._render();
  }

  _fmt(n, decimals = 0) {
    if (!isFinite(n)) return "—";
    return new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    }).format(n);
  }

  _render() {
    const cfg = this._config;
    const stateObj = this._hass.states[cfg.entity];

    if (!stateObj) {
      this._content.innerHTML = `<div class="error">Entité "${cfg.entity}" introuvable.</div>`;
      return;
    }
    const actualKm = parseFloat(stateObj.state);
    if (isNaN(actualKm)) {
      this._content.innerHTML = `<div class="error">L'entité "${cfg.entity}" n'a pas de valeur numérique (état actuel : ${stateObj.state}).</div>`;
      return;
    }

    const unit = stateObj.attributes.unit_of_measurement || "km";
    const name = cfg.name || stateObj.attributes.friendly_name || cfg.entity;
    const initialKm = Number(cfg.initial_mileage);
    const annualKm = Number(cfg.annual_mileage);
    const durationMonths = Number(cfg.duration_months);
    const startDate = new Date(cfg.start_date);
    const now = new Date();

    if (isNaN(startDate.getTime())) {
      this._content.innerHTML = `<div class="error">Date de début invalide : "${cfg.start_date}".</div>`;
      return;
    }

    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + durationMonths);

    const msPerDay = 86400000;
    const totalContractDays = (endDate - startDate) / msPerDay;
    const elapsedDaysRaw = (now - startDate) / msPerDay;

    // Contrat pas encore commencé
    if (elapsedDaysRaw < 0) {
      this._content.innerHTML = `
        <div class="header">
          <ha-icon icon="${cfg.icon}"></ha-icon>
          <div class="name">${name}</div>
          <div class="badge unknown">À venir</div>
        </div>
        <div class="sub">Le contrat démarre le ${startDate.toLocaleDateString("fr-FR")}.</div>
      `;
      return;
    }

    const elapsedDays = Math.min(elapsedDaysRaw, totalContractDays);
    const totalAllowedKm = annualKm * (durationMonths / 12);
    const consumedKm = actualKm - initialKm;
    const expectedKmAtNow = totalAllowedKm * (elapsedDays / totalContractDays);
    const diffKm = consumedKm - expectedKmAtNow;

    const timePercent = Math.min((elapsedDays / totalContractDays) * 100, 100);
    const mileagePercent = totalAllowedKm > 0 ? (consumedKm / totalAllowedKm) * 100 : 0;

    const projectedEndKm =
      elapsedDaysRaw > 0
        ? initialKm + (consumedKm / elapsedDaysRaw) * totalContractDays
        : initialKm;
    const totalAllowedAbsolute = initialKm + totalAllowedKm;
    const overageProjectedKm = projectedEndKm - totalAllowedAbsolute;

    const diffPoints = mileagePercent - timePercent;
    let status = "ok";
    if (diffPoints >= Number(cfg.danger_threshold)) status = "danger";
    else if (diffPoints >= Number(cfg.warning_threshold)) status = "warning";

    const statusLabels = {
      ok: "Dans les clous",
      warning: "À surveiller",
      danger: "Dépassement probable",
    };

    let costLine = "";
    if (cfg.cost_per_extra_km) {
      const estCost = Math.max(overageProjectedKm, 0) * Number(cfg.cost_per_extra_km);
      costLine = `
        <div class="stat">
          <div class="label">Coût de dépassement estimé</div>
          <div class="value ${estCost > 0 ? "negative" : ""}">${this._fmt(estCost, 0)} €</div>
        </div>
      `;
    }

    this._content.innerHTML = `
      <div class="header">
        <ha-icon icon="${cfg.icon}"></ha-icon>
        <div class="name">${name}</div>
        <div class="badge ${status}">${statusLabels[status]}</div>
      </div>

      <div class="big-number">${this._fmt(actualKm)}<span class="unit">${unit}</span></div>
      <div class="sub">Relevé actuel — contrat du ${startDate.toLocaleDateString("fr-FR")} au ${endDate.toLocaleDateString("fr-FR")}</div>

      <div class="bar-row">
        <div class="bar-label"><span>Temps écoulé</span><span>${this._fmt(timePercent, 0)} %</span></div>
        <div class="bar-bg"><div class="bar-fill time" style="width:${Math.min(timePercent, 100)}%"></div></div>
      </div>

      <div class="bar-row">
        <div class="bar-label"><span>Kilométrage consommé</span><span>${this._fmt(mileagePercent, 0)} %</span></div>
        <div class="bar-bg"><div class="bar-fill mileage ${status}" style="width:${Math.min(Math.max(mileagePercent, 0), 100)}%"></div></div>
      </div>

      <div class="stats-grid">
        <div class="stat">
          <div class="label">Km autorisés à ce jour</div>
          <div class="value">${this._fmt(initialKm + expectedKmAtNow)} ${unit}</div>
        </div>
        <div class="stat">
          <div class="label">Écart actuel</div>
          <div class="value ${diffKm > 0 ? "negative" : "positive"}">${diffKm > 0 ? "+" : ""}${this._fmt(diffKm)} ${unit}</div>
        </div>
        <div class="stat">
          <div class="label">Forfait total du contrat</div>
          <div class="value">${this._fmt(totalAllowedAbsolute)} ${unit}</div>
        </div>
        <div class="stat">
          <div class="label">Projection fin de contrat</div>
          <div class="value ${overageProjectedKm > 0 ? "negative" : "positive"}">${this._fmt(projectedEndKm)} ${unit}</div>
        </div>
        ${costLine}
      </div>
    `;
  }
}

customElements.define("loa-mileage-card", LoaMileageCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "loa-mileage-card",
  name: "LOA Mileage Card",
  description: "Suivi du kilométrage d'un contrat LOA/LLD par rapport au forfait annuel.",
});
