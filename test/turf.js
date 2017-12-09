var turf = require('@turf/turf');
var tileCover = require("@mapbox/tile-cover");
var featrue = turf.point([-179,99.01],{"name":"test"},{id:"123",bbox:[1,2,3,4]});
var featrue2 = turf.point([118,32],{"name":"test"},{id:"2",bbox:[1,2,3,4]});
var featrue3 = turf.point([115,32],{"name":"test"},{id:"43",bbox:[1,2,3,4]});
var featrue4 = turf.point([179.99,-85.01],{"name":"test"},{id:"12",bbox:[1,2,3,4]});
console.log("point test:",featrue);
var featureCollection = turf.featureCollection([featrue,featrue2,featrue3,featrue4]);
//console.log("featureCollection test:",featureCollection);

var bbox = turf.bbox(featureCollection);
//console.log("bbox test:",bbox);
var bboxPolygon = turf.bboxPolygon(bbox);
console.log("bboxPolygon test:",bboxPolygon);
var tileArray = tileCover.tiles(bboxPolygon.geometry,{min_zoom:1,max_zoom:1})
//console.log("tileCover test:",tileArray)



