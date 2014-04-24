'use strict';

/* Services */


// Demonstrate how to register services
// In this case it is a simple value service.
angular.module('myApp.services', []).
  factory('getStates', function($http){
  	var getStates = {
  		async: function (geometry, where) {
  			var promise = $http.jsonp("http://maps.csc.noaa.gov/arcgis/rest/services/USInteragencyElevationInventory/StateCountyQueryLayer/MapServer/3/query?outFields=STATE_NAME&outSR=102100&"+where+"&f=json&returnGeometry="+geometry+"&callback=JSON_CALLBACK").then(function(response){
  				return (response);
  			});
  			return promise;
  		}
  	}
      return getStates;
  }).
    factory('getCounties', function($http){
    var getCounties = {
      async: function (where, geometry) {
        var promise = $http.jsonp("http://maps.csc.noaa.gov/arcgis/rest/services/USInteragencyElevationInventory/StateCountyQueryLayer/MapServer/1/query?outFields=NAME,STATE_FIPS,CNTY_FIPS&returnGeometry="+geometry+"&"+where+"&f=json&o&callback=JSON_CALLBACK").then(function(response){
          return (response);
        });
        return promise;
      }
    }
      return getCounties;
  }).
  factory('intersectTopo', function($http){
    var intersectTopo = {
      async: function (xy) {      
        var promise = $http.jsonp("http://maps.csc.noaa.gov/arcgis/rest/services/USInteragencyElevationInventory/USInteragencyElevInventory/MapServer/identify?sr=102100&geometry="+xy.lon+","+xy.lat+"&spatialReference=102100&mapExtent=-16045755.364880228,3018385.277740757,-5469316.635119772,6511251.722259243&geometryType=esriGeometryPoint&imageDisplay=1081,357,96&returnGeometry=true&layers=all&f=json&tolerance=1&callback=JSON_CALLBACK").then(function(response){
          return (response);
        });
        return promise;
      }
    }
    return intersectTopo;
  }).factory('intersectTopoPost', function($http){
    //POST TO ANGULAR HACK
    //http://victorblog.com/2012/12/20/make-angularjs-http-service-behave-like-jquery-ajax/
      var intersectTopoPost = {        
        async: function (datatopost){
          var promise = $http({
                          method: 'POST', 
                          url: 'http://maps.csc.noaa.gov/arcgis/rest/services/USInteragencyElevationInventory/USInteragencyElevInventory/MapServer/identify',
                          data: datatopost
                        }).             
                       success(function(data, status, headers, config) {
                         return data
                       }).
                       error(function(data, status, headers, config) {
                         console.log('error')
                       });

          return promise;
        }
      }
      return intersectTopoPost; 
  });
