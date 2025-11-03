
var addresses={};
addresses.data=[];
addresses.isLoaded=false;


addresses.get=function(data, onSuccess){
	var data={}
	var command={"object":"addresses","method":"get","data":data};
	connection.send(JSON.stringify(command));
}

addresses.addresses=function(data){
	addresses.data=data;
	addresses.isLoaded=true;
	addresses.draw();
}

addresses.draw=function(){
	var html="";
	for (var i in addresses.data){
		html +="<tr><td>";
		html +=`<button  onclick="addresses.editAddress('`+i+`');return false;" data-bs-toggle="modal" data-bs-target="#address-modal" class="btn btn-light border-300 btn-sm me-1 text-600 shadow-none" type="button" data-bs-toggle="tooltip" data-bs-placement="top" title="Edit"><img src="assets/img/pencil.svg" alt="" width="15" /></button>`;					
		html +="</td>";
		//html += "<a href='#' onclick='deleteAddress(\""+addresses.data[i].addressId+"\");return false;'>Delete</a> <div onclick='document.getElementById(\"cancelButton\").style.visibility=\"visible\";editAddress(\""+i+"\");return false;' id='"+addresses.data[i].addressId+"'>"+
		html +="<td>"+addresses.data[i].address1 + " " ;
		if (addresses.data[i].address2.length){
			html+=addresses.data[i].address2 + " ";
		}
		html+=  addresses.data[i].city +" " + addresses.data[i].state +  " "+ addresses.data[i].zip +" "+ addresses.data[i].country;
		//if (addresses.data[i].lat){
		//	html+="<BR>Lat: " + addresses.data[i].lat + " " + "Lng: " +addresses.data[i].lng ;
		//}
		html+="</td><td>";
		html+=`<button class="btn btn-light border-300 btn-sm me-1 text-600 shadow-none" type="button" data-bs-toggle="tooltip" data-bs-placement="top" title="Delete" onclick="addresses.deleteAddress('`+addresses.data[i].addressId+`');return false;"><img src="assets/img/trash.svg" alt="" width="15" /></button>`;
		html+="</td></tr>";

	}

	document.getElementById("profile-addresses").innerHTML=html;

	trades.drawAddresses();
	
	//document.getElementById("currencyBuy-addresses").innerHTML=chooseAddresseshtml;

}

addresses.saveAddress=function(){
	//console.log("saveaddress");


	var data={};
	data.sessionId=addresses.sessionId;
	data.addressId=document.getElementById('address-addressId').value;
	data.address1=document.getElementById('address-address1').value;
	data.address2=document.getElementById('address-address2').value;
	data.city=document.getElementById('address-city').value;
	data.state=document.getElementById('address-state').value;
	data.zip=document.getElementById('address-zip').value;
	data.country=document.getElementById('address-country').value;

	var command={"object":"addresses","method":"saveAddress","data":data};
	//console.log(command);
	connection.send(JSON.stringify(command));

	//addresses.saveAddress(addresses.sessionId,addressId,address1,address2,city,state,zip,country,function(result){
	//	getUs();

	//	document.getElementById('addressId').value="";
	//	document.getElementById('address1').value="";
	//	document.getElementById('address2').value="";
	//	document.getElementById('city').value="";
	//	document.getElementById('state').value="";
	//	document.getElementById('zip').value="";
	//	document.getElementById('country').value="";
	//},
	//	function(response){
	//		addresses.message("An timeout error occurred with the server, try again.");
	//	}
	//);

	addressModal.hide();
}

addresses.cancelAddress=function(){
	//console.log("cancelAddress");
	document.getElementById('address-addressId').value="";
	document.getElementById('address-address1').value="";
	document.getElementById('address-address2').value="";
	document.getElementById('address-city').value="";
	document.getElementById('address-state').value="";
	document.getElementById('address-zip').value="";
	document.getElementById('address-country').value="";
}

addresses.addressSaved=function(data,onSuccess){
	console.log("addressSaved",data);
	
	var newAddresses=[]
	var isNewAddress=true;
	for (var i in addresses.data){

		if (data.addressId ==addresses.data[i].addressId){
			isNewAddress=false;
			addresses.data[i]=data;
			break;
		}
	}
	console.log(isNewAddress);
	if (isNewAddress){
		addresses.data.push(data);
	}
	addresses.draw();
}
addresses.addressDeleted=function(data,onSuccess){
	console.log("addressDeleted",data);
	
	var newAddresses=[]
	for (var i in addresses.data){
		if (data !=addresses.data[i].addressId){
			newAddresses.push(addresses.data[i]);
		}
	}
	addresses.data=newAddresses;
	addresses.draw();
}


addresses.editAddress=function(addressNum){
	//console.log("editAddress");
	document.getElementById('address-addressId').value=addresses.data[addressNum].addressId;
	document.getElementById('address-address1').value=addresses.data[addressNum].address1;
	document.getElementById('address-address2').value=addresses.data[addressNum].address2;
	document.getElementById('address-city').value=addresses.data[addressNum].city;
	document.getElementById('address-state').value=addresses.data[addressNum].state;
	document.getElementById('address-zip').value=addresses.data[addressNum].zip;
	document.getElementById('address-country').value=addresses.data[addressNum].country;
}
addresses.deleteAddress=function(addressId){
	console.log("deleteAddress",addressId);
	//console.log(addresses.sessionId);
	var data={};
	data.addressId=addressId;
	data.sessionId=addresses.sessionId;
	
	var command={"object":"addresses","method":"deleteAddress","data":data};
	console.log(command);
	connection.send(JSON.stringify(command));

	//addresses.deleteAddress(addresses.sessionId,addressId,function(result){
	//		getUs();
	//	},
	//	function(response){
	//		addresses.message("An timeout error occurred with the server, try again.");
	//	}
	//);
}

addresses.geocodeSuccess=function(){
	console.error('addresses - geocodeSuccess..');
}

addresses.geocodeError=function(){
	console.error('addresses - geocodeError..');
}

addresses.addressDeleteError=function(){
	console.error('addresses - addressDeleteError..');
}

addresses.saveAddressError=function(){
	console.error('addresses - saveAddressError..');
}







