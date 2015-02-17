# TileMantle

*A tool to warm up your tile server cache.* Give it a URL template, geometry, and
list of zoom levels and it will request tiles incrementally to warm it up.

```sh
$ npm install tilemantle -g
```

```
$ tilemantle -h

Usage: tilemantle <url> [<url> ...] [options]

Options:
  --version          Display version number
  -h, --help         Display usage information
  -l, --list         Don't perform any requests, just list all tile URLs
  -z, --zoom         Zoom levels (comma separated or range)
  -e, --extent       Extent of region in the form of: nw_lat,nw_lon,se_lat,se_lon
  -p, --point        Center of region (use in conjunction with -b)
  -b, --buffer       Buffer point/geometry by an amount. Affix units at end: mi,km
  -d, --delay        Delay between requests. Affix units at end: ms,s
  -m, --method       HTTP method to use to fetch tiles
  -H, --header       Set request header                                        
  -c, --concurrency  Number of tiles to request simultaneously
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