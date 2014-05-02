'use strict';

/* Controllers */

angular.module('myApp.controllers', []).
  controller('mainCtrl', ['$scope', 'getStates','intersectTopo','getCounties','intersectTopoPost', function($scope, getStates,intersectTopo,getCounties, intersectTopoPost) {
  		var domain = document.domain;

  		var stateWhereStmt = "Where=1=1";
  		var stateGeoReturn = "false"; 
  		var cntyWhereStmt = "Where=1=1"; 		
  		var cntyGeoReturn = "false";  	
  		var vlayer = new OpenLayers.Layer.Vector('SelectionLayer');
  		var vlayerResults = new OpenLayers.Layer.Vector('ResultsLayer');
  		$scope.activeBathy = false;
  		$scope.covermap = false;

  		$scope.$on('moveSlidePanel', function(e, panelstate) {  			
  		   $scope.covermap = panelstate;
  		   $scope.$apply();
  		});

  		//initial state select build
  		getStates.async(stateGeoReturn,stateWhereStmt).then(function(d){
	      var myStates = d.data.features;	  
	      myStates.sort(function(a,b){
	      	if(a.attributes.STATE_NAME < b.attributes.STATE_NAME) return -1;
      	   	if(a.attributes.STATE_NAME > b.attributes.STATE_NAME) return 1;
      	   	return 0;
	      });
	      $scope.myStates = myStates;
	      $scope.state = $scope.myStates[0];
	    });

	    $scope.stateSlct = function(){
	    	cntyWhereStmt = "Where=STATE_NAME='"+$scope.state.attributes.STATE_NAME+"'";

	    	//get counties
	    	getCounties.async(cntyWhereStmt, cntyGeoReturn).then(function(d){	    		
	    		$scope.myCounties = d.data.features;
	    		$scope.county = $scope.myCounties[0];
	    	});

	    	//get state geometry
	    	stateWhereStmt = "Where=STATE_NAME='"+$scope.state.attributes.STATE_NAME+"'";
	    	stateGeoReturn = "true";
	    	getStates.async(stateGeoReturn, stateWhereStmt).then(function(d){	    		
	    		$scope.buildVector(d.data.features);	    		
	    	})
	    }

	    $scope.cntySlct = function(){
	    	 //Zoom and show county   	
	    	cntyGeoReturn = "true";
	    	cntyWhereStmt = "Where=STATE_FIPS='"+$scope.county.attributes.STATE_FIPS+"'AND CNTY_FIPS ='"+$scope.county.attributes.CNTY_FIPS+"'";
	    	var cntyGeom;
	    	
	    	getCounties.async(cntyWhereStmt, cntyGeoReturn).then(function(d){
	    		$scope.buildVector(d.data.features);
	    		angular.forEach(d.data.features, function(v, k){
	    			cntyGeom = v.geometry;
	    		})

				var mapExt = map.getExtent();
				var mapExtStrg = mapExt.left+","+mapExt.bottom+","+mapExt.right+","+mapExt.top;				
				//convert the geometry to a string.
				cntyGeom=JSON.stringify(cntyGeom);				
				var postData ={geometryType:"esriGeometryPolygon", geometry:cntyGeom, sr:102100, layers:"visible:3,4,5,6", tolerance:1, mapExtent:mapExtStrg, imageDisplay:"1200,600,96",returnGeometry:true,f:"json",callback:"JSON_CALLBACK"}
				       	  
				 console.log("dsf" + cntyGeom, postData)
				//trigger county query again topoinv
				intersectTopoPost.async(postData).then(function(d){					
					$scope.populateGrid(d.data.results)
					$scope.buildVectorResults(d.data.results);
							

				})				

	    	});
	    }






	    

	    //setup map
	    var Navigation = new OpenLayers.Control.Navigation();
	    var Zoom = new OpenLayers.Control.Zoom();
	    var initMapCenter = new OpenLayers.LonLat(-12047607, 4087488);
	    var initMapLOZ = 4;

	    var map = new OpenLayers.Map({
	      div: "map_canvas",
	      projection: "EPSG:900913",
	      controls: []
	    });

	    map.addLayer(
	    new OpenLayers.Layer.ArcGIS93Rest("MyName", "http://maps.csc.noaa.gov/arcgis/rest/services/USInteragencyElevationInventory/USInteragencyElevInventory/MapServer/export",{
	        transparent:true,
	         layers: "0,1,2,3,4,5,6,7,8"
	       }
	    ));

	    map.addLayer(
	    new OpenLayers.Layer.XYZ("esri", 'http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}', {
	      transitionEffect: "resize",
	      sphericalMercator: true,
	      format: "image/jpg",
	      displayOutsideMaxExtent: true,
	      wrapDateLine: true
	    }));    
	   

	    map.addControl(Navigation);
	    map.addControl(Zoom); 
	    map.setCenter(initMapCenter, initMapLOZ);
	    var slctStyle = {fill:false,
	                 strokeColor:'#FCDC3B',
	                 strokeOpacity: 0.5,
	                 strokeWidth: 3			                
	                };  

	    var highlightCtrl = new OpenLayers.Control.SelectFeature(vlayerResults, {
	   						multiple: false,
			                hover: false,
			                highlightOnly: true,
			               	selectStyle: slctStyle
	              });
	    map.addControl(highlightCtrl);
	   

	    map.events.register("click", map , function(e){ 
	    	vlayer.removeAllFeatures();  
	    	var style = {
	    	               pointRadius: 8,
	    	               externalGraphic: 'img/marker.png',
	    	               rotation: 45             
	    	            };
	        var lonlat = map.getLonLatFromPixel(e.xy);	        
	        var point = new OpenLayers.Geometry.Point(lonlat.lon, lonlat.lat);
	        var pointFeature = new OpenLayers.Feature.Vector(point, null, style);  
	        vlayer.addFeatures(pointFeature);
	        //map.zoomToExtent(vlayer.getDataExtent());
	        map.addLayer(vlayer);  
	        intersectTopo.async(lonlat).then(function(d){
	            $scope.populateGrid(d.data.results);
	            $scope.buildVectorResults(d.data.results);
	        });
	    });



	 	//setup grids
		$scope.topogridOptions = { data: 'myTopo', enableSorting: true, enableColumnResize:true, 
									rowTemplate: '<div ng-style="{ \'cursor\': row.cursor }" ng-repeat="col in renderedColumns" ng-class="col.colIndex()" class="ngCell {{col.cellClass}}" ng-mouseenter="slctFtr(\'enter\', row)" ng-mouseleave="slctFtr(\'exit\',row)"><div class="ngVerticalBar" ng-style="{height: rowHeight}" ng-class="{ ngVerticalBarVisible: !$last }">&nbsp;</div><div ng-cell></div></div>',
		 							columnDefs: [{field: 'Data_Set_Name', displayName: 'Data Set Name'}, /*cellTemplate: '<div class="ngCellText" ng-mouseenter="slctFtr(\'enter\', row.getProperty(col.field))" ng-mouseleave="slctFtr(\'exit\',row.getProperty(col.field))">{{row.getProperty(col.field)}}</div>'},*/
		 										{field: 'Data_Access', displayName: 'Data Access'},
		 										{field: 'Collection_Date', displayName: 'Collection Date'},
		 										{field: 'Project_Status', displayName: 'Project Status'},
		 										{field: 'Restrictions', displayName: 'Restrictions'},
		 										{field: 'Data_Type', displayName: 'Data Type'},
		 										{field: 'Vertical_Accuracy', displayName: 'Vertical Accuracy'},
		 										{field: 'Horizontal_Accuracy', displayName: 'Horizontal Accuracy'},
		 										{field: 'Point_Spacing', displayName: 'Point Spacing'},
		 										{field: 'Vertical_Datum', displayName: 'Vertical Datum'},
		 										{field: 'Horizontal_Datum', displayName: 'Horizontal Datum'},
		 										{field: 'Products_Available', displayName: 'Products Available'},
		 										{field: 'Notes', displayName: 'Notes'}]};

		$scope.bathygridOptions = { data: 'myBathy', enableSorting: true, enableColumnResize:true,
									rowTemplate: '<div ng-style="{ \'cursor\': row.cursor }" ng-repeat="col in renderedColumns" ng-class="col.colIndex()" class="ngCell {{col.cellClass}}" ng-mouseenter="slctFtr(\'enter\', row)" ng-mouseleave="slctFtr(\'exit\',row)"><div class="ngVerticalBar" ng-style="{height: rowHeight}" ng-class="{ ngVerticalBarVisible: !$last }">&nbsp;</div><div ng-cell></div></div>',			
		 							columnDefs: [{field: 'Data_Set_Name', displayName: 'Data Set Name'}, /*cellTemplate: '<div class="ngCellText" ng-mouseenter="slctFtr(\'enter\', row.getProperty(col.field))" ng-mouseleave="slctFtr(\'exit\',row.getProperty(col.field))">{{row.getProperty(col.field)}}</div>'},*/
		 										{field: 'Data_Access', displayName: 'Data Access'},
		 										{field: 'Data_Type', displayName: 'Data Type'},
		 										{field: 'Collection_Date', displayName: 'Collection Date'},
		 										{field: 'Ship_Name', displayName: 'Ship Name'},
		 										{field: 'Instruments', displayName: 'Instruments'},		 										
		 										{field: 'Notes', displayName: 'Notes'}]};  
		
		//reused functions below
		$scope.buildVector = function(data){

    		var polygonList = [],
				multiPolygonGeometry,
				multiPolygonFeature;

			vlayer.removeAllFeatures();

    		angular.forEach(data, function(v, k){
				var rings = v.geometry.rings;    				
					    				
				angular.forEach(rings, function(val, key){
					var myring = val;
					var points = [];	    				

					angular.forEach(myring, function(xy, x){	    						
						var thisXY = new OpenLayers.Geometry.Point(xy[0], xy[1]);
						points.push(thisXY);
					})    					
					var ring = new OpenLayers.Geometry.LinearRing(points);
					var polygon = new OpenLayers.Geometry.Polygon([ring]);
					polygonList.push(polygon); 	    					
				})
				//http://stackoverflow.com/questions/13939308/openlayers-how-do-i-draw-a-multipolygon
				var style = {
				               fill:false,
				               strokeColor:'#FCDC3B',
				               strokeWidth: 5                
				            };
				var multiPolygonGeometry = new OpenLayers.Geometry.MultiPolygon(polygonList);
				var multiPolygonFeature = new OpenLayers.Feature.Vector(multiPolygonGeometry, null, style);
				vlayer = new OpenLayers.Layer.Vector("STATE");
				vlayer.addFeatures(multiPolygonFeature);
				map.zoomToExtent(vlayer.getDataExtent());
				map.addLayer(vlayer);
    		})
		}

		$scope.buildVectorResults = function(data){

    		

			var polystyle = {fill:false,
			             strokeColor:'#4c4cff',
			             strokeOpacity: 0.7,
			             strokeWidth: 3		                
			            };
			var linestyle = {fill:false,
			             strokeColor:'#4c4cff',
			             strokeOpacity: 0.7,
			             strokeWidth: 3			                
			            };            
			            	
			vlayerResults.removeAllFeatures();
			
			
    		angular.forEach(data, function(v, k){  			
    			
    			if(v.geometryType == "esriGeometryPolygon"){
    				var rings = v.geometry.rings;
		    		var polygonList = [];				
						    				
					angular.forEach(rings, function(val, key){
						var myring = val;
						var points = [];
						angular.forEach(myring, function(xy, x){	    						
							var thisXY = new OpenLayers.Geometry.Point(xy[0], xy[1]);
							points.push(thisXY);
						})    					
						var ring = new OpenLayers.Geometry.LinearRing(points);
						var polygon = new OpenLayers.Geometry.Polygon([ring]);
						polygonList.push(polygon); 	    					
					})
					//http://stackoverflow.com/questions/13939308/openlayers-how-do-i-draw-a-multipolygon
					var multiPolygonGeometry = new OpenLayers.Geometry.MultiPolygon(polygonList);
					var multiPolygonFeature = new OpenLayers.Feature.Vector(multiPolygonGeometry, null, polystyle);
					multiPolygonFeature.id = v.value;
					vlayerResults.addFeatures(multiPolygonFeature);					
    			}    			
    			if(v.geometryType == "esriGeometryPolyline"){
    				
    				var paths = v.geometry.paths;
    				var pointList = [];    				
    				angular.forEach(paths, function(xy, x){ 
    					angular.forEach(xy, function(pntArrs, i){
    						var thisXY = new OpenLayers.Geometry.Point(pntArrs[0], pntArrs[1]);
    						pointList.push(thisXY);
    					})    					    					
    				})    				
    				var lineStrng = new OpenLayers.Geometry.LineString(pointList);    				
    				var lineFeature = new OpenLayers.Feature.Vector(lineStrng, null, linestyle);
    				lineFeature.id = v.value;    				
    				vlayerResults.addFeatures(lineFeature);
    			}
				map.addLayer(vlayerResults);
				highlightCtrl.activate();				
    		})
		}

		$scope.populateGrid = function(data){

			$scope.myTopo=[];
			$scope.myBathy=[];
			angular.forEach(data, function(v,k){
			  if(v.layerName == "Topographic Lidar"||v.layerName == "Topobathy Shoreline Lidar"||v.layerName == "IfSAR"||v.layerName == "Bathymetric Lidar"){
			    var topoObj = {"Data_Set_Name":v.value,
			                  "Data_Access":v.attributes.Data_Access,
			                  "Metadata":v.attributes.Metadata_Link,
			                  "Collection_Date":v.attributes.Collection_Date,
			                  "Project_Status":v.attributes.Project_Status,
			                  "Restrictions":v.attributes.Restrictions,
			                  "Data_Type":v.attributes.Data_Type,
			                  "Vertical_Accuracy":v.attributes.Vertical_Accuracy,
			                  "Horizontal_Accuracy":v.attributes.Horizontal_Accuracy,
			                  "Point_Spacing":v.attributes.Point_Spacing,
			                  "Vertical_Datum":v.attributes.Vertical_Datum,
			                  "Horizontal_Datum":v.attributes.Horizontal_Datum,
			                  "Products_Available":v.attributes.Products_Available,
			                  "Notes":v.attributes.Notes
			    }

			    $scope.myTopo.push(topoObj);

			  }
			  else{
			  	var bathyObj ={"Data_Set_Name":v.value,
			                  "Data_Access":v.attributes.Data_Access,
			                  "Data_Type":v.attributes.Data_Type,
			                  "Collection_Date":v.attributes.Collection_Date,
			                  "Ship_Name":v.attributes.Ship_Name,
			                  "Instruments":v.attributes.Instruments,
			                  "Notes":v.attributes.Notes
			  	}

			  	$scope.myBathy.push(bathyObj);			  
			  }
			})
			
			$scope.activeBathy = true;


		}

		$scope.slctFtr = function(mousetype, layerID){	
			var lyrName = layerID.elm[0].children[0].textContent;
			lyrName = lyrName.trim();
			

			if(mousetype == "exit"){
				angular.forEach(vlayerResults.features, function(v,k){
					if(v.id == lyrName){											
						highlightCtrl.unhighlight(v);
					}
				})
			}
			if (mousetype == "enter"){
				angular.forEach(vlayerResults.features, function(v,k){									
					if(v.id == lyrName){											
						highlightCtrl.select(v);
					}
				})
			}			
		}
		





  }]);