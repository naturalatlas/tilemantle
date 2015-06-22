# TileMantle

TileMantle is a tile invalidation/warming server. POST geometries to it and it'll incremently re-render the the affected tiles. It comes with a nice dashboard that lets you watch the progress in realtime.

## Configuration

In your project root, create a "tilemantle.json":

```js
{
  "port": 8080,
  "store": {
    "adapter": "sqlite",
    "file": "./tilemantle.lite"
  },

  // what should the filesize of posted geojson be capped at?
  "upload_limit": "5mb",
  
  // these settings are inherited by each item in "requests" for each preset
  "preset_defaults": {
    "retries": 5,
    "retry_delay": 1000
  },

  // this is the important part. presets are
  "presets": {
    "basemap": {
      "title": "Basemap",
      "requests": [
        {"url": "https://tiles.naturalatlas.com/topo/{z}/{x}/{y}/t.pbf", "headers": {"X-TileStrata-CacheSkip": "topo/t.pbf"}},
        {"url": "https://tiles.naturalatlas.com/basemap/{z}/{x}/{y}/t.png", "headers": {"X-TileStrata-CacheSkip": "topo/t.png,basemap/t.png"}},
        {"url": "https://tiles.naturalatlas.com/basemap/{z}/{x}/{y}/t@2x.png", "headers": {"X-TileStrata-CacheSkip": "topo/t@2x.png,basemap/t@2x.png"}},
        {"url": "https://tiles.naturalatlas.com/topo/{z}/{x}/{y}/t.pbf", "headers": {"X-TileStrata-CacheSkip": "topo/t.pbf"}}
      ]
    }
  },
  "display_layers": [
    {"title": "OpenStreetMap", "url_1x": "http://{s}.tile.osm.org/{z}/{x}/{y}.png", "attribution": "&copy; <a href=\"http://osm.org/copyright\">OpenStreetMap</a> contributors"},
    {"title": "Natural Atlas", "url_1x": "http://tiles.naturalatlas.com/basemap/{z}/{x}/{y}/t.png", "url_2x": "http://tiles.naturalatlas.com/basemap/{z}/{x}/{y}/t@2x.png", "minZoom": 6, "maxZoom": 15}
  ]
}
```

## API

```
POST /api/invalidate 
  preset: [preset name]
  geom: [geojson geometry]
```

## Contributing

Before submitting pull requests, please update the [tests](test) and make sure they all pass.

```sh
$ npm test
```

## License

Copyright &copy; 2015 [Natural Atlas, Inc.](https://github.com/naturalatlas) & [Contributors](https://github.com/naturalatlas/tilemantle/graphs/contributors)

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at: http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
