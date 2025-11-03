

var users={};
users.activeUser;
users.addresses=[];
users.getUsers=function(data,onSuccess,onFailure){
	
	var data={}
	data.sessionId=admin.sessionId;
	var command={"object":"admin","method":"adminGetUsers","data":data};
	//console.log(command);
	connection.send(JSON.stringify(command));
}

users.userData=function(data,onSuccess,onFailure){
	//console.log("userData",data);
	users.data=data;
	if(users.addresses.length){
		users.mergeUserAddresses();
	}
	users.drawUsers();
}
users.drawUsers=function(){
	//console.log('draw')
		
	var html="";
	for (var i in users.data){
		html+="<tr  onclick='users.activeUser=users.data["+i+"];users.drawEditUser();pages.go(`editUser`);'>";
		html+="<td nowrap><a>" + users.data[i].firstName+" " + users.data[i].lastName+ "</a></td>";
		html+="<td nowrap>" + users.data[i].email+"</td>";
		html+="</tr>";
	}
	document.getElementById("users").innerHTML=html;

	
}
users.drawEditUser=function(){
	document.getElementById("editUserId").value=users.activeUser.userId;
	document.getElementById("firstName").value=users.activeUser.firstName;
	document.getElementById("lastName").value=users.activeUser.lastName;
	document.getElementById("email").value=users.activeUser.email;
	document.getElementById("phone").value=users.activeUser.phone;
	document.getElementById("password").value=users.activeUser.password;

	console.log(users.activeUser.addresses);
	users.drawAddresses();
}

users.updateUser=function(){
	var action="updateTrader";
            
	var data={};
	data.editUserId=document.getElementById('editUserId').value
	data.firstName=document.getElementById('firstName').value
	data.lastName=document.getElementById('lastName').value
	data.phone=document.getElementById('phone').value
	data.email=document.getElementById('email').value
	data.password=document.getElementById('password').value
	
	var command={"object":"admin","method":"adminUpdateUser","data":data};
	console.log(command);
	connection.send(JSON.stringify(command));

	
}

users.userUpdated=function(data,onSuccess,onFailure){
	console.log("userUpdated");
	
	document.getElementById("userUpdatedMSG").innerHTML="User data has been saved";
}

users.getAddresses=function(data,onSuccess,onFailure){
	
	var data={}
	data.sessionId=admin.sessionId;
	var command={"object":"admin","method":"adminGetAddresses","data":data};
	//console.log(command);
	connection.send(JSON.stringify(command));
}



users.addressData=function(data,onSuccess,onFailure){
	//console.log("addressData",data);
	users.addresses=data;

	if(users.data.length){
		users.mergeUserAddresses();
	}
	//users.drawAddresses();
}

users.mergeUserAddresses=function(){
	console.log("mergeUserAddresses");
	for (var i in users.addresses){
		for (var j in users.data){
			if (users.data[j].userId==users.addresses[i].userId){
				if (!users.data[j].addresses){
					users.data[j].addresses=[];
				}
				users.data[j].addresses.push(users.addresses[i]);
				break;
			}
		}
	}
	if (users.activeUser){
		users.drawAddresses();
	}
}
users.drawAddresses=function(){
	console.log('draw')
	
	if (users.activeUser){

		var addresses=users.activeUser.addresses
	
		var html="";
		for (var i in addresses){
			html+="<tr onclick='alert(`not ready`);'>";
			html+="<td nowrap>"+addresses[i].addressId+"</td>";
			html+="<td nowrap>"+addresses[i].address1+"</td>";
			html+="</tr>";
		}
		document.getElementById("addresses").innerHTML=html;
	}
}