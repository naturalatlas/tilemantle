var turf = require('@turf/turf');
var featrue = turf.point([118,34],{"name":"测试"},{id:"123",bbox:[1,2,3,4]});
var featrue2 = turf.point([118,32],{"name":"测试"},{id:"2",bbox:[1,2,3,4]});
var featrue3 = turf.point([115,32],{"name":"测试"},{id:"43",bbox:[1,2,3,4]});
var featrue4 = turf.point([116,33],{"name":"测试"},{id:"12",bbox:[1,2,3,4]});
console.log("point test:",featrue);
var featureCollection = turf.featureCollection([featrue,featrue2,featrue3,featrue4]);
console.log("featureCollection test:",featureCollection);

var bbox = turf.bbox(featureCollection);
console.log("bbox test:",bbox);
var bboxPolygon = turf.bboxPolygon(bbox);
console.log("bboxPolygon test:",bboxPolygon.geometry.coordinates);



