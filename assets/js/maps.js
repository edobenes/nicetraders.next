var maps={};
maps.isLoaded=true;
maps.mapId="";
maps.map;


maps.initMap=function(mapId, onSuccess){
	
	if (maps.mapId==mapId){
		
		return;
	}
	// console.log("initMap",mapId);

	var startingCoords = {lat: 40.714, lng: -74.005};
	maps.mapId=mapId;
	maps.map = new google.maps.Map(document.getElementById(mapId) , {zoom: 11, center: startingCoords, mapTypeControl:false, streetViewControl:false, fullscreenControl:false});
	maps.map.addListener("click", (e) => {
		console.log('click',e.latLng.lat(),e.latLng.lng());
	});
	if (onSuccess){
		onSuccess();
	}
}

maps.chooseAddress=function (num){	
	addressNumber=num;
	//center = {lat :addresses[addressNumber].lat, lng :addresses[addressNumber].lng}
	maps.moveToLocation(addresses[addressNumber].lat, addresses[addressNumber].lng);
	
}
maps.changeRadius=function (){
	var map=maps.map;
	maps.radius=parseInt(document.getElementById("currency-distance").value);
	if (!maps.radius){
		maps.radius=10;
	}
	if(maps.drivingCircle){
		maps.drivingCircle.setMap(null);
	}
	maps.drivingCircle = new google.maps.Circle({
		strokeColor: "#FF0000",
		strokeOpacity: 0.8,
		strokeWeight: 2,
		fillColor: "#FF0000",
		fillOpacity: 0.25,
		map,
		center: maps.center,
		radius: maps.radius*1000,
	});
}

maps.moveToLocation=function (lat, lng){
	maps.center = new google.maps.LatLng(lat, lng);
	// using global variable:
	
	maps.map.panTo(maps.center);
	maps.changeRadius();
}