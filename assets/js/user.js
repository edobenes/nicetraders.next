
var user={};
user.sessionId=Cookies.get('sessionId');
user.referredByUserId=""; // in nice/navigation.js
user.data={};
user.data.session;
user.data.user;
user.data.addresses;
user.isLoaded=false;

user.verifySession=function(){

	var data={}
	data.sessionId=user.sessionId;
	var command={"object":"users","method":"verifyBySessionId","data":data};
	connection.send(JSON.stringify(command));

	
}


user.sessionVerified=function(data,onSuccess,onFailure){	
	user.data.session=data;
	
	//console.log("sessionVerified",data);
	if (app){
		app.onLoggedin(false);
	} else{
		console.error("app not setup");
	}

	
}

user.login=function(){

	//console.log("login: " );
	var data={}
	data.email=document.getElementById("login-email").value;
	data.password=document.getElementById("login-password").value;
	var command={"object":"users","method":"login","data":data};
	
	connection.send(JSON.stringify(command));
}


user.loggedIn=function(data,onSuccess,onFailure){

	document.getElementById("login-email").value="";
	document.getElementById("login-password").value="";
	console.log("loggedIn: " , data);
			
	if (data.sessionId){
		user.sessionId=data.sessionId;
		Cookies.set("sessionId",data.sessionId, { expires: 365 });
		user.message("errorMsg","Looks good");
		
		user.sessionVerified(data,onSuccess,onFailure);
		app.onLoggedin(true);
	} else{
		Cookies.remove('sessionId');
		user.message("errorMsg","The email and password is wrong");
	}
	
}



user.logout=function(){
	app.isDataLoaded=false;
	Cookies.remove('sessionId');
	user.message("errorMsg","");
	pages.go("loggedOut");
}


user.get=function(data){
	var command={"object":"users","method":"get","data":data};
	connection.send(JSON.stringify(command));
}
user.userData=function(data,onSuccess,onFailure){
	//console.log(data)
	user.data.user=data[0];
	user.isLoaded=true;
	user.drawProfile(user.data.user);
}
user.drawProfile=function(data){
	if (!data){return;}
	document.getElementById("profile-firstName").value=data.firstName;
	document.getElementById("profile-lastName").value=data.lastName;
	document.getElementById("profile-email").value=data.email;
	document.getElementById("profile-phone").value=data.phone;
	document.getElementById("profile-unit").value=data.unit;
}



user.forgotPassword = function(){
	//console.log("login: " );
	var data={}
	data.email=document.getElementById("forgot-email").value;
	var command={"object":"users","method":"forgotPassword","data":data};
	connection.send(JSON.stringify(command));
}



user.createAccount = function(){
	//console.log("createAccount: " );
	var data={}
	
	var fullName=document.getElementById('register-fullName').value;
	var a_fullName=fullName.split(" ");
	data.firstName=a_fullName[0];
	data.lastName="";
	if (a_fullName.length > 1){
		a_fullName.shift(); //remove the first name
		data.lastName=a_fullName.join(" " );
	}
	data.referredByUserId="";
	data.email=document.getElementById('register-email').value;
	data.phone=document.getElementById('register-phone').value;
	data.password=document.getElementById('register-password').value;
	var password2=document.getElementById('register-confirm-password').value;
	if (data.password != password2){
		document.getElementById("register-confirm-password").classList.add('is-invalid')
	}

	var form=document.getElementById("registerForm");
	
	if (!form.checkValidity()) {
		form.classList.add('was-validated');
		//event.preventDefault();
		//event.stopPropagation();
		return false;
		
	} else{
		form.classList.add('was-validated');
	}

	
	var command={"object":"users","method":"create","data":data};
	connection.send(JSON.stringify(command));

}

user.createSuccess = function(data,onSuccess,onFailure){
	//console.log("createSuccess: " );
	
	if (data.sessionId){
		Cookies.set("sessionId",data.sessionId, { expires: 365 });
		location.href="index.html";
		//user.message("errorMsg","Looks good");
		//var command={"object":"pages","method":"go","data":"dashboardPage"};
		//onSuccess(command);
	} else{
		Cookies.remove('sessionId');
		user.message("errorMsg","The email and password is wrong");
	}
}
user.createError = function(data,onSuccess,onFailure){
	console.error("user - createError");	
}

user.clearError=function(){
	document.getElementById("errorMsg").innerHTML="";
}

user.save=function(){
	user.message("myProfileMsg", "Validating... please wait...");

	var data={};
	data.firstName=document.getElementById('profile-firstName').value;
	data.lastName=document.getElementById('profile-lastName').value;
	data.email=document.getElementById('profile-email').value;
	data.phone=document.getElementById('profile-phone').value;
	data.unit=document.getElementById('profile-unit').value;
	

	var profileForm=document.getElementById("profileForm");
	if (!profileForm.checkValidity()) {
		profileForm.classList.add('was-validated');
		//event.preventDefault();
		//event.stopPropagation();
		//console.log("form not valid",profileForm);
		return false;
	} else{
		profileForm.classList.add('was-validated');
	}
	user.message("myProfileMsg","Saving... please wait...");

	

	var command={"object":"users","method":"update","data":data};
	//console.log(command);
	connection.send(JSON.stringify(command));

	
	
}


user.updated=function(){
	//console.log("updated");
	user.message("myProfileMsg","Saved");
}

user.message=function (id, msg){
	document.getElementById(id).innerHTML=msg; 
}


user.changePassword=function(){
	user.message("passwordMsg","Saving... please wait...");
	
	var oldPassword=document.getElementById('changePassword-oldPassword').value;
	var newPassword1=document.getElementById('changePassword-newPassword1').value;
	var newPassword2=document.getElementById('changePassword-newPassword2').value;
	
	if (newPassword1!=newPassword2){
		user.message("passwordMsg","Passwords must match!");
		return;
	}
	var form=document.getElementById("changePasswordForm");
	
	if (!form.checkValidity()) {
		//event.preventDefault();
		//event.stopPropagation();
		return false;
		
	} else{
		form.classList.add('was-validated');
	}

	var data={};
	data.oldPassword=oldPassword;
	data.newPassword=newPassword1;
	data.sessionId=user.sessionId;
	
	var command={"object":"users","method":"changePassword","data":data};
	//console.log(command);
	connection.send(JSON.stringify(command));

	
	
}

user.passwordChanged=function(){
	user.message("passwordMsg","Password updated");
	var form=document.getElementById("changePasswordForm");
	form.classList.remove('was-validated');
	document.getElementById('changePassword-oldPassword').value="";
	document.getElementById('changePassword-newPassword1').value="";
	document.getElementById('changePassword-newPassword2').value="";
}

user.userByEmail=function(){
	console.error('user - userByEmail..');
}
user.userDeleted=function(){
	console.error('user - userDeleted..');
}

user.userDeleteError=function(){
	console.error('user - userDeleteError..');
}

user.newSessionCreated=function(){
	console.error('user - newSessionCreated..');
}

user.updateError=function(){
	console.error('user - updateError..');
}
user.passwordDeleted=function(){
	console.error('user - passwordDeleted..');
}
user.forgotPasswordError=function(){
	console.error('user - forgotPasswordError..');
}
user.forgotPasswordSent=function(){
	console.error('user - forgotPasswordSent..');
}


user.passwordChangeError=function(){
	console.error('user - passwordChangeError..');
}
user.loginFail=function(){
	console.error("user - loginFail");
	document.getElementById("loginErrorMsg").innerHTML="This email or password is incorrect";
}
user.missingLoginVariables=function(){
	document.getElementById("loginErrorMsg").innerHTML="Enter your email and password";
}
