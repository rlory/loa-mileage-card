# LOA Mileage Card

Carte Lovelace pour Home Assistant qui suit la consommation kilométrique
d'un contrat de LOA / LLD par rapport au forfait annuel, à partir d'une
entité odomètre (ex. capteur d'une intégration constructeur, OBD, etc.).

Elle compare en permanence :
- le **% de temps écoulé** sur le contrat,
- le **% du forfait kilométrique** déjà consommé,

et affiche un statut visuel (vert / orange / rouge) si vous roulez plus
vite que ce que le contrat autorise, avec une **projection du
kilométrage en fin de contrat**.

## Installation

### Option A — Manuelle
1. Copiez `loa-mileage-card.js` dans `config/www/` (créez le dossier
   `www` à la racine de votre configuration Home Assistant s'il
   n'existe pas).
2. Allez dans **Paramètres → Tableaux de bord → Ressources** et
   ajoutez :
   - URL : `/local/loa-mileage-card.js`
   - Type de ressource : **Module JavaScript**
3. Rechargez le navigateur (Ctrl+F5).

### Option B — HACS (dépôt personnalisé)
1. Placez ce dossier dans un dépôt Git (GitHub par exemple).
2. Dans HACS → Frontend → menu (⋮) → **Dépôts personnalisés**, ajoutez
   l'URL du dépôt avec la catégorie **Lovelace**.
3. Installez "LOA Mileage Card" depuis HACS, puis ajoutez la ressource
   si elle n'est pas ajoutée automatiquement.

## Configuration

Ajoutez une carte par véhicule dans votre tableau de bord :

```yaml
type: custom:loa-mileage-card
entity: sensor.odometre_voiture_1
name: Peugeot 308
icon: mdi:car
start_date: '2024-03-15'
duration_months: 48
annual_mileage: 15000
initial_mileage: 12
cost_per_extra_km: 0.12
warning_threshold: 5
danger_threshold: 15
```

Pour comparer deux véhicules (ex. décider lequel garder), ajoutez
simplement une deuxième carte avec les paramètres du second contrat :

```yaml
type: custom:loa-mileage-card
entity: sensor.odometre_voiture_2
name: Renault Mégane
icon: mdi:car
start_date: '2023-09-01'
duration_months: 36
annual_mileage: 12000
initial_mileage: 8
cost_per_extra_km: 0.15
```

Vous pouvez les regrouper dans une carte `horizontal-stack` ou
`grid` pour les voir côte à côte.

### Paramètres

| Clé | Obligatoire | Description |
|---|---|---|
| `entity` | oui | Entité odomètre (état numérique, en km ou mi) |
| `start_date` | oui | Date de début du contrat, format `YYYY-MM-DD` |
| `duration_months` | oui | Durée du contrat en mois |
| `annual_mileage` | oui | Forfait kilométrique annuel autorisé |
| `initial_mileage` | oui | Relevé de l'odomètre au début du contrat |
| `name` | non | Nom affiché (par défaut : nom de l'entité) |
| `icon` | non | Icône MDI (par défaut `mdi:car`) |
| `cost_per_extra_km` | non | Coût au km au-delà du forfait (€), pour estimer la facture de dépassement |
| `warning_threshold` | non | Écart en points (% km − % temps) déclenchant le statut orange (défaut : 5) |
| `danger_threshold` | non | Écart en points déclenchant le statut rouge (défaut : 15) |

### Ce qu'affiche la carte

- **Relevé actuel** de l'odomètre.
- **Barre "Temps écoulé"** : où vous en êtes dans la durée du contrat.
- **Barre "Kilométrage consommé"** : où vous en êtes dans le forfait.
- **Km autorisés à ce jour** : ce que le contrat vous permet d'avoir
  roulé à la date du jour.
- **Écart actuel** : différence entre ce que vous avez réellement
  roulé et ce qui était prévu à ce stade.
- **Forfait total du contrat** : kilométrage total autorisé sur toute
  la durée.
- **Projection fin de contrat** : kilométrage estimé si vous continuez
  au même rythme, pour anticiper un dépassement avant qu'il n'arrive.
- **Coût de dépassement estimé** (si `cost_per_extra_km` est défini).

Le badge de statut (Dans les clous / À surveiller / Dépassement
probable) se base sur l'écart entre le % du forfait consommé et le %
du temps écoulé.
