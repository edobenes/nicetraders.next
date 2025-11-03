
if (!adminDebug){
	var adminDebug=false;
}
var admin={};
admin.data={};
admin.data.user;
admin.sessionId=Cookies.get('sessionId');
admin.verifyAdminSession=function(onSuccess,onTimeout){
	
	var data={}
	data.sessionId=admin.sessionId;
	var command={"object":"admin","method":"verifyAdminSession","data":data};
	//console.log(command);
	connection.send(JSON.stringify(command));
	if (app){
		app.onLoggedin();
	} else{
		console.error("app not setup");
	}
}

admin.sessionVerified=function(data,onSuccess,onFailure){
	admin.data.user=data;
	//console.log('session')

	//var command={"object":"trades","method":"getTradeSearches","data":data};
	//connection.send(JSON.stringify(command));
	
	
	var command={"object":"pages","method":"go","data":"dashboardPage"};
	onSuccess(command);
}


admin.login=function(){
	

	var data={}
	data.email=document.getElementById("login-email").value;
	data.password=document.getElementById("login-password").value;
	var command={"object":"admin","method":"login","data":data};
	//console.log(command);
	connection.send(JSON.stringify(command));
	
}


admin.logout=function(){
	Cookies.remove('sessionId');
	admin.message("errorMsg","");
	pages.go("loggedOut");
}
admin.loggedIn=function(data,onSuccess,onFailure){
	if (data.sessionId){
		Cookies.set("sessionId",data.sessionId, { expires: 365 });
		admin.message("errorMsg","Looks good");
		
		admin.sessionVerified(data,onSuccess,onFailure);
		

	} else{
		Cookies.remove('sessionId');
		admin.message("errorMsg","The email and password is wrong");
	}
}
admin.message=function (id, msg){
	document.getElementById(id).innerHTML=msg; 
}

//admin.create=function(firstName,lastName,email,password,phone,onSuccess,onTimeout){
//	var action="createUser";
//	var url = basePath + "?firstName="+firstName+"&lastName="+lastName + "&email=" + email + "&phone=" + phone + "&password=" + password + "&action="+action;
//	if (adminDebug){
//		console.log("url: " + url);
//	}
	
	
//	httpget(url,onSuccess,onTimeout);
//}

//admin.getUserBySessionId=function(sessionId,onSuccess,onTimeout){
//	var action="getUserBySessionId";


//	var url = basePath + "?sessionId="+sessionId+"&action=" + action;

//	if (adminDebug){
//		console.log("url: " + url);
//	}

	
//	httpget(url,onSuccess,onTimeout);
//}

//admin.update=function(sessionId,firstName,lastName,email,phone,password,password2,onSuccess,onTimeout){

//	var action="updateUser";
//	console.log(action);
//	console.log("sessionId: " + sessionId);
//	console.log("firstname: " + firstName);
//	console.log("lastName: " + lastName);
//	console.log("email: " + email);
//	console.log("phone: " + phone);
//	console.log("password: " + password);
//	console.log("password2: " + password2);
//	console.log("action: " + action);

//	if (password != password2){
//		alert("your passwords do not match");
//	}

//	var url = basePath + "?sessionId="+sessionId+"&firstName="+firstName+"&lastName="+lastName + "&email=" + email + "&phone=" + phone + "&password=" + password + "&action="+action;
//	if (adminDebug){
//		console.log("url: " + url);
//	}
	
//	httpget(url,onSuccess,onTimeout);
//}
//admin.login=function(email,password,onSuccess,onTimeout){

//	if (adminDebug){
//		console.log("admin.log",email,password);
//	}

//	var action="adminLogin";
	
//	var url = basePath + "?email=" + email + "&password=" + password + "&action=" + action;
//	if (adminDebug){
//		console.log("url: " + url);
//	}
//	httpget(url,onSuccess,onTimeout);
//}

//admin.getUsers=function(sessionId,filter, onSuccess,onTimeout){
//	var action="AdminGetUsers";
	

//	var url = basePath + "?sessionId="+sessionId+"&action=" + action + "&filter="+filter;

//	if (adminDebug){
//		console.log("url: " + url);
//	}
//	httpget(url,onSuccess,onTimeout);
//}

//admin.getUser=function(sessionId,userId,onSuccess,onTimeout){
//	var action="AdminGetUser";
//	if (adminDebug){
//		console.log("userId: " + userId);
//		console.log("sessionId: " + sessionId);
//		console.log("action: " + action);
//	}

//	var url = basePath + "?sessionId="+sessionId+"&userId="+userId+"&action=" + action;

//	if (adminDebug){
//		console.log("url: " + url);
//	}
//	httpget(url,onSuccess,onTimeout);
//}

//admin.updateUser=function(sessionId,userId,firstName,lastName,email,phone,password,onSuccess,onTimeout){
//	var action="adminUpdateUser";
//	if (adminDebug){
//		console.log("userId: " + userId);
//		console.log("sessionId: " + sessionId);
//		console.log("action: " + action);
//	}

	
//	var url = basePath + "?sessionId="+sessionId+"&userId="+userId+"&firstName="+firstName+"&lastName="+lastName + "&email=" + email + "&phone=" + phone+ "&password=" + password + "&action="+action;
	

//	if (adminDebug){
//		console.log("url: " + url);
//	}
//	httpget(url,onSuccess,onTimeout);
//}
