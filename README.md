# TileMantle

*A tool to warm up your tile server cache.* Give it a URL template, region, and
list of zoom levels and it will request tiles incrementally.

```sh
$ npm install tilemantle -g
```

### Usage

```sh
# use a point with a 12mi radius 
$ tilemantle http://myhost.com/{z}/{x}/{y}.png --point=44.523333,-109.057222 --buffer=12mi -z 10-14

# use an extent (nw,se)
$ tilemantle http://myhost.com/{z}/{x}/{y}.png --extent=44.523333,-109.057222,41.145556,-104.801944 -z 10-14

# use a geojson geometry as bounds
$ cat region.geojson | tilemantle http://myhost.com/{z}/{x}/{y}.png -z 10-14

# use a geojson geometry as bounds + buffer by distance
$ cat region.geojson | tilemantle http://myhost.com/{z}/{x}/{y}.png --buffer=20mi -z 10-14
```

## Contributing

Before submitting pull requests, please update the [tests](test) and make sure they all pass.

```sh
$ npm test
```

## License

Copyright &copy; 2015 [Brian Reavis](https://github.com/brianreavis) & [Contributors](https://github.com/naturalatlas/tilemantle/graphs/contributors)

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at: http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.