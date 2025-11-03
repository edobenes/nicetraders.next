
var pages={};
pages.defaultPage="dashboardPage";
pages.isLoaded=true;
pages.lastId="";
pages.state={};


pages.dashboardPage={};
pages.dashboardPage.nav=true;
pages.loginPage={};
pages.loginPage.nav=false;
pages.registerPage={};
pages.registerPage.nav=false;
pages.forgotPasswordPage={};
pages.forgotPasswordPage.nav=false;
pages.loggedOut={};
pages.loggedOut.nav=false;
pages.termsPage={};
pages.termsPage.nav=false;
pages.changePassword={};
pages.changePassword.nav=true;
pages.myProfile={};
pages.myProfile.nav=true;





pages.tradePage1={};
pages.tradePage1.nav=true;
pages.tradePage1.onload=function(){
	//console.log("pages.tradePage1")
	maps.initMap("currency-searchMap");
	trades.setActiveTrade(app.url);
	if (pages.lastId.search("tradeSellPage")<0){
		//trades.init()
	}
	
};
pages.tradePage2={};
pages.tradePage2.nav=true;
pages.tradePage2.onload=function(){
	

	currency.loadCurrency();
	
	
	maps.initMap("currency-searchMap");
	trades.setActiveTrade(app.url,function(){
		console.log("active trade",trades.activeTrade);
	
		trades.drawAddresses();
	});

	// console.log("MOVEMAP 1!",trades.activeTrade.lat,trades.activeTrade.lng);
	
	// console.log("MOVEMAP 2!",trades.activeTrade.lat,trades.activeTrade.lng);

	//setTimeout(function(){maps.moveToLocation(trades.activeTrade.lat, trades.activeTrade.lng);},1000);
	
};
pages.tradePage3={};
pages.tradePage3.nav=true;
pages.tradePage3.onload=function(){
	// console.log("app.url",app.url);
	trades.setActiveTrade(app.url
		,function(){
			// console.log("active trade",trades.activeTrade);
			trades.tradeSearches();
			trades.drawAddresses();
		});
	initPayPalButton();
};

pages.tradePage4={};
pages.tradePage4.nav=true;
pages.tradePage4.onload=function(){
	
	maps.initMap("meetupSearchMap");
	trades.setActiveTrade(app.url
		,function(){
			console.log("active trade",trades.activeTrade);
			// trades.tradeSearches();
			trades.drawTradePage4();
		});
		
	
};

pages.tradePage5={};
pages.tradePage5.nav=true;
pages.tradePage5.onload=function(){
	
	
};

pages.tradePage6={};
pages.tradePage6.nav=true;
pages.tradePage6.onload=function(){
	
	
};




pages.scheduleMeetup={}
pages.scheduleMeetup.nav=true;
pages.scheduleMeetup.onload=function(){
};

pages.error={}
pages.error.nav=true;




//I don't love this solution, but this is how the server causes the client to change pages.
pages.serverGo=function(data){
	console.log("serverGo",data.id)
	if (data.clear){
		console.log('CLEAR SESSION!')
		Cookies.remove('sessionId');
		if (user && user.sessionId){
			delete user.sessionId;
		}
	}
	pages.go(data.id);
}

//window.onpopstate = function (event) {
//	console.log(event.state);
//	if(event.state) {
//		//pages.go(event.state.id,event.state.showNav);
//	}
	
//}

pages.go=function(id,queryString,ignoreHistory){
	// console.log("---------------------------------pages.go",id,queryString);
	// console.log("pages.last",pages.lastId,pages.lastQueryString);
	if (!id || id=='undefined'){

		// console.log('none length',id)
		pages.go(pages.defaultPage);
		return;
	} else{
		// console.log('has length',id)
	}
	if (pages.id==id && pages.queryString==queryString){

		// console.log("break loop");
		return;
	}
	pages.id=id;
	pages.queryString=queryString;
	if (!queryString){
		queryString="";
	} else{
		queryString="?"+queryString;
	}
	if (!ignoreHistory){
		history.pushState( { "id": id }, null,"index.html"+queryString+ "#"+id);
		//app.setUrlVariables();
	}
	app.setUrlVariables();
	if (pages[id].onload){
		pages[id].onload();
	}


	var lastPage;
	var nextPage;
	if (pages.lastId.length>0){
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
	pages.lastQueryString=queryString;
}

window.onpopstate = function (event) { 
	// console.log("window.onpopstate",event.state.id);
  var content = "";
  if(event.state && event.state.id) {
	  pages.go(event.state.id,'',true);
  }
}