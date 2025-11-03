
var pages={};
pages.lastId;


pages.loginPage={};
pages.loginPage.nav=false;
pages.loggedOut={};
pages.loggedOut.nav=false;

pages.dashboardPage={};
pages.dashboardPage.nav=true;
pages.editUser={};
pages.editUser.nav=true;
pages.editUser.onload=function(){
	console.log('editUser')
};





//I don't love this solution, but this is how the server causes the client to change pages.
pages.serverGo=function(data){
	pages.go(data.id, data.showNav);
}

window.onpopstate = function (event) {
	//console.log(event.state);
	if(event.state) {
		
		pages.go(event.state.id,event.state.showNav);
	}
	
}

pages.go=function(id){
	history.pushState({'id':id},"",'#'+id);


	var lastPage;
	var nextPage;
	if (pages.lastId){
		lastPage=document.getElementById(pages.lastId);
		if (lastPage){
			//console.log("lastPage",true);
			lastPage.style.display="none";
		}
	}



	if (pages[id].nav){
		document.getElementById("navbar").style.display="";
	}else{
		document.getElementById("navbar").style.display="none";
	}
	
	nextPage=document.getElementById(id);
	if (nextPage){
		nextPage.style.display="";
	}

	pages.lastId=id;



	if (pages[id].onload){
		pages[id].onload();
	}
}