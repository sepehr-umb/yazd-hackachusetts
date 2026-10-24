# Language access statistic

Limited-English households in the Massachusetts Environmental Justice block groups.

## Scope

Layer 8 holds only the 2,316 Environmental Justice block groups. It is not a statewide layer, so these figures describe EJ block groups and not all of Massachusetts.

## Results

| Measure | Value |
|---|---|
| Limited-English households (derived, approximate) | about 127,389 |
| Total households | 1,185,173 |
| Block groups meeting the English isolation criterion | 287 |
| Limited-English share of households | about 10.75% |
| Block groups in the layer | 2,316 |

## Fields used

- `TOTAL_HH`: total households
- `PCT_LIMENG`: percent of households that are limited-English
- `LIMITEDENG`: English isolation flag. `E` means the criterion is met. A blank space means it is not.

## Derivation

The layer has no limited-English household count. The count is derived as `TOTAL_HH * PCT_LIMENG / 100` and summed across block groups. `PCT_LIMENG` is a rounded percentage, so the derived count is approximate.

## Query URLs

Layer: `https://services.arcgis.com/2gdL2gxYNFY2TOUb/ArcGIS/rest/services/Map2/FeatureServer/8`

Metadata:

```
https://services.arcgis.com/2gdL2gxYNFY2TOUb/ArcGIS/rest/services/Map2/FeatureServer/8?f=json
```

Sample rows:

```
https://services.arcgis.com/2gdL2gxYNFY2TOUb/ArcGIS/rest/services/Map2/FeatureServer/8/query?where=1%3D1&outFields=TOTAL_HH,PCT_LIMENG,LIMITEDENG,EJ_CRITERI&resultRecordCount=5&returnGeometry=false&f=json
```

English isolation flag distribution (287 `E`, 2,029 blank):

```
https://services.arcgis.com/2gdL2gxYNFY2TOUb/ArcGIS/rest/services/Map2/FeatureServer/8/query?where=1%3D1&groupByFieldsForStatistics=LIMITEDENG&outStatistics=%5B%7B%22statisticType%22%3A%22count%22%2C%22onStatisticField%22%3A%22FID%22%2C%22outStatisticFieldName%22%3A%22n%22%7D%5D&f=json
```

Sums of total and limited-English households:

```
https://services.arcgis.com/2gdL2gxYNFY2TOUb/ArcGIS/rest/services/Map2/FeatureServer/8/query?where=1%3D1&outStatistics=%5B%7B%22statisticType%22%3A%22sum%22%2C%22onStatisticField%22%3A%22TOTAL_HH%22%2C%22outStatisticFieldName%22%3A%22total_hh%22%7D%2C%7B%22statisticType%22%3A%22sum%22%2C%22onStatisticField%22%3A%22TOTAL_HH*PCT_LIMENG%2F100%22%2C%22outStatisticFieldName%22%3A%22limeng_hh%22%7D%2C%7B%22statisticType%22%3A%22count%22%2C%22onStatisticField%22%3A%22FID%22%2C%22outStatisticFieldName%22%3A%22n_bg%22%7D%2C%7B%22statisticType%22%3A%22count%22%2C%22onStatisticField%22%3A%22PCT_LIMENG%22%2C%22outStatisticFieldName%22%3A%22n_pct%22%7D%5D&f=json
```

English isolation count:

```
https://services.arcgis.com/2gdL2gxYNFY2TOUb/ArcGIS/rest/services/Map2/FeatureServer/8/query?where=LIMITEDENG%3D%27E%27&returnCountOnly=true&f=json
```

## Source

ACS 2015-2019 data in the Massachusetts 2020 Environmental Justice Populations layer (MassGIS): https://www.mass.gov/info-details/massgis-data-2020-us-census-environmental-justice-populations
