
tradesBuy={};
tradesBuy.activeTrade;
tradesBuy.activeMatch;
tradesBuy.searches;
tradesBuy.buyMatches;
tradesBuy.sellMatches;

tradesBuy.getTradeSearches=function(data){
	var command={"object":"trades","method":"getTradeSearches","data":data};
	connection.send(JSON.stringify(command));
}

tradesBuy.tradeSearches=function(data,onSuccess,onFailure){
	tradesBuy.searches=data[0];

	for (var j in tradesBuy.searches){
		tradesBuy.searches[j].buyMatches=[];
		tradesBuy.searches[j].sellMatches=[];
	}



	

	tradesBuy.drawHaveWant();

	tradesBuy.drawWantHave();

}




tradesBuy.saveTradeSearch=function(type){
	if (type=="buy"){
		var data={}
		data.sessionId=user.sessionId;
		data.currencyHave=document.getElementById("currencyBuy-currencyHave").value.toLowerCase();
		data.currencyWant=document.getElementById("currencyBuy-currencyWant").value.toLowerCase();
		data.lat=document.getElementById("currencyBuy-lat").value;
		data.lng=document.getElementById("currencyBuy-lng").value;
		data.tradeSearchId=document.getElementById("currencyBuy-tradeSearchId").value;
		data.distance=document.getElementById("currencyBuy-distance").value;
		data.amount=0;

	}else{
		var data={}
		data.sessionId=user.sessionId;
		data.currencyHave=document.getElementById("currencySell-currencyHave").value.toLowerCase();
		data.currencyWant=document.getElementById("currencySell-currencyWant").value.toLowerCase();
		data.amount=document.getElementById("currencySell-amount").value.replace(/[^0-9]/g, '');
		data.lat=document.getElementById("currencySell-lat").value;
		data.lng=document.getElementById("currencySell-lng").value;
		data.addressId=document.getElementById("currencySell-addressId").value;
		data.tradeSearchId=document.getElementById("currencySell-tradeSearchId").value;
		data.distance=document.getElementById("currencySell-distance").value;
	}
	var command={"object":"trades","method":"saveTradeSearch","data":data};
	connection.send(JSON.stringify(command));


	tradesBuy.getTradeSearches(user.data.session);
	tradesBuy.getTradeMatches(user.data.session);
}




tradesBuy.drawHaveWant=function(){
	var html="";
	for(var i=0;i<tradesBuy.searches.length;i++){
		var dateAdded=moment(tradesBuy.searches[i].dateAdded);
		//html+="<tr><td><button onclick=\"location.href='tradeMatches.html?tradeSearchId=" + tradesBuy.searches[i].tradeSearchId + "';\">View Matches</button></td>";
		
		
		
		if (tradesBuy.searches[i].amountHave>0){

			var haveCurrency=tradesBuy.searches[i].have;
			
			var wantCurrency=tradesBuy.searches[i].want;
			var haveValueINUSD=tradesBuy.searches[i].amountHave/exchangeRates[tradesBuy.searches[i].have].rate;
			if (wantCurrency=='usd'){
				var wantValue=haveValueINUSD;
			
			} else{
				var wantValue=haveValueINUSD/exchangeRates[tradesBuy.searches[i].want].inverseRate;
			}

			wantValue=wantValue.toFixed(3);
			html+=`			<tr class="border-bottom border-200"  onclick="tradesBuy.activeTrade=tradesBuy.searches[`+i+`];pages.go('wizardSellPage','',true);">`;
			html+=`				<td>`;
			html+=`					<div class="d-flex flex-grow-1 align-items-center position-relative">`;
			html+=`						<img src="assets/img/flags/`+tradesBuy.searches[i].have+`.png" width="40" height="25" alt="" >`; 
			html+=`						<div class="flex-1 ms-3">`;
			html+=`							<h6 class="mb-1 fw-semi-bold">`+tradesBuy.searches[i].amountHave+` ` +tradesBuy.searches[i].have.toUpperCase()+`</h6>`;					
			html+=`						</div>`;
			html+=`					</div>`;
			html+=`				</td>`;
			html+=`				<td></td>`;
			html+=`				<td>`;
			html+=`					<div class="d-flex flex-grow-1 align-items-center position-relative">`;
			html+=`						<img src="assets/img/flags/`+tradesBuy.searches[i].want+`.png" width="40" height="25" alt="" >`; 
			html+=`						<div class="flex-1 ms-3">`;
			html+=`							<h6 class="mb-1 fw-semi-bold">`+parseInt(wantValue) + ` ` +tradesBuy.searches[i].want.toUpperCase()+`</h6>`;
			html+=`							<p class="fw-semi-bold mb-0 text-500"></p>`;
			html+=`						</div>`;
			html+=`					</div>`;
			html+=`				</td>`;	
			html+=`			</tr>`;
			
			
			
		}
		
	}
	//console.log(html);
	document.getElementById("haveCurrencyTrades").innerHTML=html;
}




tradesBuy.getTradeMatches=function(data, onSuccess, onFailure){
	//console.log('getTradeMatches')
	var command={"object":"trades","method":"getBuyTradeMatches","data":data};
	//console.log(command); 	
	connection.send(JSON.stringify(command));
	command={"object":"trades","method":"getSellTradeMatches","data":data};
	//console.log(command);
	connection.send(JSON.stringify(command));
}



tradesBuy.sellTradeMatches=function(data){
	tradesBuy.sellMatches=data;
	tradesBuy.sellSearchMerge();
}
tradesBuy.sellSearchMerge=function(){
	if (!tradesBuy.searches || !tradesBuy.sellMatches){console.log("no data"); return;}
	for (var h in tradesBuy.searches){
		tradesBuy.searches[h].sellMatches=[];
	}

	for (var i in tradesBuy.sellMatches){
		
		for (var j in tradesBuy.searches){
			if (tradesBuy.sellMatches[i].sellerTradeSearchId== tradesBuy.searches[j].tradeSearchId){
				tradesBuy.searches[j].sellMatches.push(tradesBuy.sellMatches[i]);
				break;
			}
		}
	}
	
	tradesBuy.drawSellTradeMatches();
}

tradesBuy.drawSellTradeMatches=function(){
	if (!tradesBuy.activeTrade || !tradesBuy.activeTrade.sellMatches){
		//console.log('no active trade');
		return;
	}
	document.getElementById("sellTradeMatchTable").innerHTML="";
	var showButtons=true;
	var html="";
	
	for (var i=0;i<tradesBuy.activeTrade.sellMatches.length;i++){
		html+=`<tr><td>`;
		if (!tradesBuy.activeTrade.sellMatches[i].buyerStatus){
			html+=`<button class="btn btn-primary" onclick="tradesBuy.matchTrade('`+tradesBuy.activeTrade.sellMatches[i].sellerTradeSearchId+`','`+tradesBuy.activeTrade.sellMatches[i].buyTradeSearchId+`','seller');" >Contact</button>`;
			
		} else if (tradesBuy.activeTrade.sellMatches[i].buyerStatus=="pending acceptance"){
			//html+=`You: Waiting for Buyer<BR>`;
			html+=`Buyer: `+ tradesBuy.activeTrade.sellMatches[i].buyerStatus;

			//console.log('a',tradesBuy.activeTrade)
			//console.log(tradesBuy.activeTrade.sellMatches[i].tradeMatchId);
			//html+=`<input type="button" onclick="tradesBuy.acceptTrade('`+tradesBuy.activeTrade.sellMatches[i].tradeMatchId+`',"seller");" value="Accept">`;
			//html+=` <input type="button" onclick="tradesBuy.rejectTrade('`+tradesBuy.activeTrade.sellMatches[i].tradeMatchId+`',"seller");" value="Reject">`;
			


		} else if (tradesBuy.activeTrade.sellMatches[i].sellerStatus=="pending acceptance"){
		
			//console.log('a',tradesBuy.activeTrade)
			//console.log(tradesBuy.activeTrade.sellMatches[i].tradeMatchId);
			html+=`<input type="button" onclick="tradesBuy.acceptTrade('`+tradesBuy.activeTrade.sellMatches[i].tradeMatchId+`','seller');" value="Accept">`;
			html+=` <input type="button" onclick="tradesBuy.rejectTrade('`+tradesBuy.activeTrade.sellMatches[i].tradeMatchId+`','seller');" value="Reject">`;
			


		}
		
		else if (tradesBuy.activeTrade.sellMatches[i].sellerStatus == "pending payment"){
			html+=`<button class="btn btn-primary" onclick="iam='seller';tradeMatchId='`+tradesBuy.activeTrade.sellMatches[i].tradeMatchId+`'" type="button" data-bs-toggle="modal" data-bs-target="#payment-modal" >Pay $1</button>`;
			showButtons=false;
		} else if (tradesBuy.activeTrade.sellMatches[i].buyerStatus == "pending payment"){
			html+=`Buyer: `+ tradesBuy.activeTrade.sellMatches[i].buyerStatus;
			html+=`<br>You: `+ tradesBuy.activeTrade.sellMatches[i].sellerStatus;
			showButtons=false;
		} else if (tradesBuy.activeTrade.sellMatches[i].sellerStatus == "paid" && tradesBuy.activeTrade.sellMatches[i].buyerStatus == "paid"){
			html+=`<input type="button" class="btn btn-success" onclick="tradesBuy.activeMatch=tradesBuy.activeTrade.sellMatches[`+i+`];pages.go('scheduleMeetup');" value="Schedule Meetup">`;
			
			
			showButtons=false;
		} else if (tradesBuy.activeTrade.sellMatches[i].sellerStatus == "rejected"){
			html+=`Seller: `+ tradesBuy.activeTrade.sellMatches[i].sellerStatus;

		} else{
			html+=`Seller: `+ tradesBuy.activeTrade.sellMatches[i].sellerStatus +`<BR>Buyer: `+ tradesBuy.activeTrade.sellMatches[i].buyerStatus;
			document.getElementById("editSellDeleteBtns").style.display="none";	
		}
		
		
		
		html+=`</td><td>`;
		html+=`<img src="assets/img/flags/`+tradesBuy.activeTrade.sellMatches[i].have+`.png" width="40" height="25" alt="" >`; 
			
		html+=`</td><td>`;
		html+=tradesBuy.activeTrade.sellMatches[i].firstName;
		html+=`</td><td>`;
		html+=parseInt(tradesBuy.activeTrade.sellMatches[i].distance) + ` km`;
		html+=`</td></tr>`;
	}
	if (showButtons){
		document.getElementById("editSellDeleteBtns").style.display="";
	} else{
		document.getElementById("editSellDeleteBtns").style.display="none";
	}
	document.getElementById("sellTradeMatchTable").innerHTML=html;
}












tradesBuy.buyTradeMatches=function(data){
	tradesBuy.buyMatches=data;
	tradesBuy.buySearchMerge();
	//tradesBuy.drawBuyTradeMatches();
}
tradesBuy.buySearchMerge=function(){
	if (!tradesBuy.searches || !tradesBuy.buyMatches){ return;}
	for (var k in tradesBuy.searches){
		tradesBuy.searches[k].buyMatches=[];
	}
	for (var i in tradesBuy.buyMatches){
		for (var j in tradesBuy.searches){
			if (tradesBuy.buyMatches[i].buyTradeSearchId== tradesBuy.searches[j].tradeSearchId){
			
				tradesBuy.searches[j].buyMatches.push(tradesBuy.buyMatches[i]);
				break;
			}
		}
	}
	
	tradesBuy.drawBuyTradeMatches();
}













tradesBuy.drawWantHave=function(){
	var html="";
	for(var i=0;i<tradesBuy.searches.length;i++){
		var dateAdded=moment(tradesBuy.searches[i].dateAdded);
		//html+="<tr><td><button onclick=\"location.href='tradeMatches.html?tradeSearchId=" + tradesBuy.searches[i].tradeSearchId + "';\">View Matches</button></td>";
		
		if (tradesBuy.searches[i].amountHave==0){
			var haveCurrency=tradesBuy.searches[i].have;
			var wantCurrency=tradesBuy.searches[i].want;
			var wantValue;
			if (haveCurrency=='usd'){
				
				var haveValueINUSD=tradesBuy.searches[i].amountHave;
			} else{
				var haveValueINUSD=tradesBuy.searches[i].amountHave/exchangeRates[tradesBuy.searches[i].have].rate;
			
			}
			if (wantCurrency=='usd'){
				wantValue=haveValueINUSD;
			} else{
				wantValue=haveValueINUSD/exchangeRates[tradesBuy.searches[i].want].inverseRate;
			}
			

			wantValue=wantValue.toFixed(3);
			html+=`			<tr class="border-bottom border-200"  onclick="tradesBuy.activeTrade=tradesBuy.searches[`+i+`];pages.go('wizardBuyPage');">`;
			html+=`				<td>`;
			html+=`					<div class="d-flex flex-grow-1 align-items-center position-relative">`;
			html+=`						<img src="assets/img/flags/`+tradesBuy.searches[i].want+`.png" width="40" height="25" alt="" >`; 
			html+=`						<div class="flex-1 ms-3">`;
			html+=`							<h6 class="mb-1 fw-semi-bold">` +tradesBuy.searches[i].want.toUpperCase()+`</h6>`;				
			html+=`						</div>`;
			html+=`					</div>`;
			html+=`				</td>`;
			html+=`				<td></td>`;
			html+=`				<td>`;
			html+=`					<div class="d-flex flex-grow-1 align-items-center position-relative">`;
			html+=`						<img src="assets/img/flags/`+tradesBuy.searches[i].have+`.png" width="40" height="25" alt="" >`; 
			html+=`						<div class="flex-1 ms-3">`;
			html+=`							<h6 class="mb-1 fw-semi-bold">`+tradesBuy.searches[i].have.toUpperCase()+`</h6>`;
			html+=`							<p class="fw-semi-bold mb-0 text-500"></p>`;
			html+=`						</div>`;
			html+=`					</div>`;
			html+=`				</td>`;
			
			html+=`			</tr>`;
			
			
			
		}
		
	}
	document.getElementById("wantCurrencyTrades").innerHTML=html;
}

tradesBuy.drawTradeSearch=function(){
	console.log("drawTradeSearch")
	if (!tradesBuy.activeTrade){ return;}
	var haveCurrency=tradesBuy.activeTrade.have;
	var wantCurrency=tradesBuy.activeTrade.want;
	if (haveCurrency=='usd'){
		var haveValueINUSD=tradesBuy.activeTrade.amountHave;
	} else{
		var haveValueINUSD=tradesBuy.activeTrade.amountHave/exchangeRates[tradesBuy.activeTrade.have].rate;
	}
	if (wantCurrency=='usd'){
		var wantValue=haveValueINUSD;
	} else{
		var wantValue=haveValueINUSD/exchangeRates[tradesBuy.activeTrade.want].inverseRate;
	}

	wantValue=wantValue.toFixed(3);

	if(tradesBuy.activeTrade.amountHave){
		amountHave=tradesBuy.activeTrade.amountHave
	}else{
		amountHave="";
	}
	console.log(tradesBuy.activeTrade)
	document.getElementById("sellTradeHave").innerHTML=amountHave + ` ` +tradesBuy.activeTrade.have.toUpperCase() + ` <img src="assets/img/flags/`+tradesBuy.activeTrade.have+`.png" width="40" height="25" alt="" >`;
	document.getElementById("sellTradeWant").innerHTML=parseInt(wantValue) + ` ` + tradesBuy.activeTrade.want.toUpperCase() + ` <img src="assets/img/flags/`+tradesBuy.activeTrade.want+`.png" width="40" height="25" alt="" >`;
	document.getElementById("buyTradeHave").innerHTML=amountHave + ` ` +tradesBuy.activeTrade.have.toUpperCase() + ` <img src="assets/img/flags/`+tradesBuy.activeTrade.have+`.png" width="40" height="25" alt="" >`;
	document.getElementById("buyTradeWant").innerHTML=parseInt(wantValue) + ` ` + tradesBuy.activeTrade.want.toUpperCase() + ` <img src="assets/img/flags/`+tradesBuy.activeTrade.want+`.png" width="40" height="25" alt="" >`;
	
}



tradesBuy.drawBuyTradeMatches=function(){
	if (!tradesBuy.activeTrade || !tradesBuy.activeTrade.buyMatches){return;}

//console.log(tradesBuy.activeTrade)
	var showButtons=true;
			
	var html="";
	for (var i=0;i<tradesBuy.activeTrade.buyMatches.length;i++){


		var wantCurrency=tradesBuy.activeTrade.buyMatches[i].want;
		var haveValueINUSD=tradesBuy.activeTrade.buyMatches[i].amountHave/exchangeRates[tradesBuy.activeTrade.buyMatches[i].have].rate;
		var wantValue=haveValueINUSD/exchangeRates[tradesBuy.activeTrade.buyMatches[i].want].inverseRate;
		//if (wantCurrency=='usd'){
		//	var wantValue=haveValueINUSD;					
		//} else{
		//	var wantValue=haveValueINUSD/exchangeRates[tradesBuy.activeTrade.buyMatches[i].want].inverseRate;
		//}

		wantValue=parseInt(wantValue);

		html+=`<tr><td>`;
		console.log(tradesBuy.activeTrade.buyMatches[i])
		if (!tradesBuy.activeTrade.buyMatches[i].buyerStatus){
			html+=`<input type="button" onclick="tradesBuy.matchTrade('`+tradesBuy.activeTrade.buyMatches[i].sellerTradeSearchId+`','`+tradesBuy.activeTrade.buyMatches[i].buyTradeSearchId+`','buyer');" value="Contact">`;
			
		}  else if (tradesBuy.activeTrade.buyMatches[i].sellerStatus=="pending acceptance"){
			//html+=`You: Waiting for Buyer<BR>`;
			html+=`Waiting for the Seller to Accept`
			//console.log('a',tradesBuy.activeTrade)
			//console.log(tradesBuy.activeTrade.buyMatches[i].tradeMatchId);
			//html+=`<input type="button" onclick="tradesBuy.acceptTrade('`+tradesBuy.activeTrade.buyMatches[i].tradeMatchId+`','buyer');" value="Accept">`;
			//html+=` <input type="button" onclick="tradesBuy.rejectTrade('`+tradesBuy.activeTrade.buyMatches[i].tradeMatchId+`','buyer');" value="Reject">`;
			


		} else if (tradesBuy.activeTrade.buyMatches[i].buyerStatus=="pending acceptance"){
		
			//console.log('a',tradesBuy.activeTrade)
			//console.log(tradesBuy.activeTrade.buyMatches[i].tradeMatchId);
			html+=`<input type="button" onclick="tradesBuy.acceptTrade('`+tradesBuy.activeTrade.buyMatches[i].tradeMatchId+`','buyer');" value="Accept">`;
			html+=` <input type="button" onclick="tradesBuy.rejectTrade('`+tradesBuy.activeTrade.buyMatches[i].tradeMatchId+`','buyer');" value="Reject">`;
			


		}
		
		
		
		
		
		
		
		//else if (tradesBuy.activeTrade.buyMatches[i].buyerStatus=="pending acceptance"){
		//	console.log('a',tradesBuy.activeTrade)
		//	console.log(tradesBuy.activeTrade.buyMatches[i].tradeMatchId);
		//	html+=`<input type="button" onclick="tradesBuy.acceptTrade('`+tradesBuy.activeTrade.buyMatches[i].tradeMatchId+`','buyer');" value="Accept">`;
		//	html+=` <input type="button" onclick="tradesBuy.rejectTrade('`+tradesBuy.activeTrade.buyMatches[i].tradeMatchId+`','buyer');" value="Reject">`;
			
		//} 
		else if (tradesBuy.activeTrade.buyMatches[i].buyerStatus == "pending payment"){
			html+=`<button class="btn btn-primary" onclick="iam='buyer';tradeMatchId='`+tradesBuy.activeTrade.buyMatches[i].tradeMatchId+`'" type="button" data-bs-toggle="modal" data-bs-target="#payment-modal" >Pay $1</button>`;
			showButtons=false;
		} else if (tradesBuy.activeTrade.buyMatches[i].sellerStatus == "pending payment"){
			html+=`You: `+ tradesBuy.activeTrade.buyMatches[i].buyerStatus;
			html+=`<BR>Seller: `+ tradesBuy.activeTrade.buyMatches[i].sellerStatus;
			showButtons=false;
		} else if (tradesBuy.activeTrade.buyMatches[i].sellerStatus == "paid" && tradesBuy.activeTrade.buyMatches[i].buyerStatus == "paid"){
			html+=`<input type="button" class="btn btn-success" onclick="tradesBuy.activeMatch=tradesBuy.activeTrade.buyMatches[`+i+`];pages.go('scheduleMeetup');" value="Schedule Meetup">`;
			
			showButtons=false;
		} else if (tradesBuy.activeTrade.buyMatches[i].sellerStatus == "rejected"){
			html+=`Seller: `+ tradesBuy.activeTrade.buyMatches[i].sellerStatus;

		} else{
			html+=`Seller: `+ tradesBuy.activeTrade.buyMatches[i].sellerStatus+`<BR>`;
			html+=`Buyer: `+ tradesBuy.activeTrade.buyMatches[i].buyerStatus;
			document.getElementById("editBuyDeleteBtns").style.display="none";	
		}
		html+=`</td><td>`;
		html+=tradesBuy.activeTrade.buyMatches[i].amountHave + ` `+tradesBuy.activeTrade.buyMatches[i].have.toUpperCase()+` <img src="assets/img/flags/`+tradesBuy.activeTrade.buyMatches[i].have+`.png" width="40" height="25" alt="" >`; 
			
		html+=`</td><td>`;
		html+=wantValue + ` `+tradesBuy.activeTrade.buyMatches[i].want.toUpperCase()+` <img src="assets/img/flags/`+tradesBuy.activeTrade.buyMatches[i].want+`.png" width="40" height="25" alt="" >`; 
		html+=`</td><td>`;
		html+=tradesBuy.activeTrade.buyMatches[i].firstName;
		html+=`</td><td>`;
		html+=parseInt(tradesBuy.activeTrade.buyMatches[i].distance) + ` km`;
		
		html+=`</td></tr>`;
	}
	console.log('showButtons',showButtons)
	if (showButtons){
		document.getElementById("editBuyDeleteBtns").style.display="";
	} else{
		document.getElementById("editBuyDeleteBtns").style.display="none";

	}
	document.getElementById("buyTradeMatchTable").innerHTML=html;
}



//tradesBuy.getBuyTradeMatches=function(sessionId,tradeSearchId, onSuccess,onTimeout){
//	//var action="getBuyTradeMatches";

//	//var url = basePath + "?action=" + action+"&sessionId="+sessionId +"&tradeSearchId="+tradeSearchId;


//	////console.log("url: " + url);
	
//	//httpget(url,onSuccess,onTimeout);
	
//}


tradesBuy.deleteTradeSearch=function(data, onSuccess,onTimeout){
	console.log("DELETE",data);
	//var action="deleteTradeSearch";
	
	//var url = basePath + "?action=" + action+"&sessionId="+sessionId+"&tradeSearchId="+tradeSearchId;


	////console.log("url: " + url);
	
	//httpget(url,onSuccess,onTimeout);
	var data={};
	data.tradeSearchId=tradesBuy.activeTrade.tradeSearchId;
	var command={"object":"trades","method":"deleteTradeSearch","data":data};
	console.log(command);
	connection.send(JSON.stringify(command));
}

tradesBuy.tradeSearchDeleted=function(data,onSuccess,onFailure){
	tradesBuy.getTradeSearches(user.data.session);
	tradesBuy.getTradeMatches(user.data.session);
	pages.go('dashboardPage');

	//console.log(data)
	//var newTrades=[]
	//for (var i in tradesBuy.searches){
	//	if (data !=tradesBuy.searches[i].tradeSearchId){
	//		newtradesBuy.push(tradesBuy.searches[i]);
	//	}
	//}
	//tradesBuy.searches=newTrades;
	//addresses.draw();
}
//tradesBuy.getTradeSearch=function(sessionId,tradeSearchId, onSuccess,onTimeout){
//	var action="getTradeSearch";

//	var url = basePath + "?action=" + action+"&sessionId="+sessionId +"&tradeSearchId="+tradeSearchId;


//	//console.log("url: " + url);
	
//	httpget(url,onSuccess,onTimeout);
	
//}

//tradesBuy.getTradeMatch=function(sessionId,tradeMatchId, onSuccess,onTimeout){
//	var action="getTradeMatch";

//	var url = basePath + "?action=" + action+"&sessionId="+sessionId +"&tradeMatchId="+tradeMatchId;


//	//console.log("url: " + url);
	
//	httpget(url,onSuccess,onTimeout);
	
//}



tradesBuy.matchTrade=function(sellTradeSearchId,buyTradeSearchId,iam,onSuccess,onTimeout){
	
	var data={};
	data.sessionId=user.sessionId;
	data.sellTradeSearchId=sellTradeSearchId;
	data.buyTradeSearchId=buyTradeSearchId;
	data.iam=iam;
	var command={"object":"trades","method":"matchTrade","data":data};
	console.log(command);
	connection.send(JSON.stringify(command));

}
tradesBuy.newTradeMatch=function(data,onSuccess,onFailure){
	console.log("newTradeMatch",data);
	
	//tradesBuy.getTradeSearches(user.data.session);
	tradesBuy.getTradeMatches(user.data.session);
	//tradesBuy.drawBuyTradeMatches();
	//tradesBuy.drawTradeSearch();
	//tradesBuy.drawSellTradeMatches();
	//tradesBuy.drawTradeSearch();
}
tradesBuy.acceptTrade=function(tradeMatchId,iam,onSuccess,onTimeout){
	//var action="acceptTrade";
	//var url = basePath + "?action=" + action+"&sessionId="+sessionId +"&tradeMatchId="+tradeMatchId;
	//httpget(url,onSuccess,onTimeout);

	var data={};
	data.sessionId=user.sessionId;
	data.tradeMatchId=tradeMatchId;
	data.iam=iam;
	var command={"object":"trades","method":"acceptTrade","data":data};
	console.log(command);
	connection.send(JSON.stringify(command));

	
}
tradesBuy.tradeAccepted=function(data,onSuccess,onTimeout){
	console.log("tradeAccepted");
	tradesBuy.getTradeMatches(user.data.session);
}
tradesBuy.rejectTrade=function(sessionId, tradeMatchId,iam,onSuccess,onTimeout){
	//var action="rejectTrade";
	//var url = basePath + "?action=" + action+"&sessionId="+sessionId +"&tradeMatchId="+tradeMatchId;
	//httpget(url,onSuccess,onTimeout);
	var data={};
	data.sessionId=user.sessionId;
	data.tradeMatchId=tradeMatchId;
	data.iam=iam;
	var command={"object":"trades","method":"rejectTrade","data":data};
	console.log(command);
	connection.send(JSON.stringify(command));


}
tradesBuy.tradeRejected=function(data,onSuccess,onTimeout){
	console.log("traderejected");
	tradesBuy.getTradeMatches(user.data.session);
}

tradesBuy.sellerPayment=function(sessionId, tradeMatchId, paypalOrderId, onSuccess,onTimeout){
	var data={};
	data.sessionId=user.sessionId;
	data.tradeMatchId=tradeMatchId;
	data.paypalOrderId=paypalOrderId;
	
	var command={"object":"trades","method":"sellerPayment","data":data};
	connection.send(JSON.stringify(command));
}
tradesBuy.buyerPaid=function(data, onSuccess,onTimeout){
	tradesBuy.getTradeMatches(user.data.session);
	paymentModal.hide();
}

tradesBuy.sellerPaid=function(data, onSuccess,onTimeout){
	tradesBuy.getTradeMatches(user.data.session);
	paymentModal.hide();
}

tradesBuy.tradeAccepted=function(data,onSuccess,onTimeout){
	console.log("tradeAccepted");
	tradesBuy.getTradeMatches(user.data.session);
}


tradesBuy.buyerPayment=function(sessionId, tradeMatchId, paypalOrderId, onSuccess,onTimeout){
	var data={};
	data.sessionId=user.sessionId;
	data.tradeMatchId=tradeMatchId;
	data.paypalOrderId=paypalOrderId;
	
	var command={"object":"trades","method":"buyerPayment","data":data};
	connection.send(JSON.stringify(command));
}

tradesBuy.suggestTradeMatchDate=function(data,onSuccess){
	var data={};
	
	data.sessionId=user.sessionId;
	data.tradeMatchId=tradesBuy.activeMatch.tradeMatchId;
	data.dateTimeSuggest=new Date(document.getElementById("dateSuggest").value + " " + document.getElementById("timeSuggest").value);

	console.log(data);	
	var command={"object":"trades","method":"suggestTradeMatchDate","data":data};
	connection.send(JSON.stringify(command));
}
tradesBuy.checkFuture=	function (){
		var form=document.getElementById("suggestDateForm");

		form.classList.add('needs-validation');
		form.classList.remove('was-validated');
		var dateSuggest=document.getElementById("dateSuggest").value;
		var timeSuggest=document.getElementById("timeSuggest").value;
		
		var d=new Date(dateSuggest + " " + timeSuggest);
		
		var now=new Date();
		if (d > now){
			console.log("in future");
			document.getElementById("dateSuggest").classList.remove('is-invalid')
			

			
		} else{
			console.log('in past');
			form.classList.remove('was-validated');
			document.getElementById("dateSuggest").classList.remove('valid')
		}
		var form=document.getElementById("suggestDateForm");
		
		if (!form.checkValidity()) {
			form.classList.add('was-validated');
			//event.preventDefault();
			//event.stopPropagation();
			return false;
			
		} else{
			form.classList.add('was-validated');
		}
	}

tradesBuy.tradeSearchId=function(){
	console.error('trades - tradeSearchId..');
}

tradesBuy.tradeSearchIdError=function(){
	console.error('trades - tradeSearchIdError..');
}
tradesBuy.tradeSearchSaved=function(){
	console.log('trades - tradeSearchSaved..');
}
tradesBuy.tradeSearchError=function(){
	console.error('trades - tradeSearchError..');
}

tradesBuy.tradeSearchDeleteError=function(){
	console.error('trades - tradeSearchDeleteError..');
}
tradesBuy.insertMatchError=function(){
	console.error('trades - insertMatchError..');
}
tradesBuy.acceptTradeError=function(){
	console.error('trades - acceptTradeError..');
}
tradesBuy.rejectTradeError=function(){
	console.error('trades - rejectTradeError..');
}
tradesBuy.adminTradeSearches=function(){
	console.error('trades - adminTradeSearches..');
}
tradesBuy.adminGetTradeSearchesError=function(){
	console.error('trades - adminGetTradeSearchesError..');
}
tradesBuy.adminTradeMatches=function(){
	console.error('trades - adminTradeMatches..');
}
tradesBuy.adminGetTradeMatchesError=function(){
	console.error('trades - adminGetTradeMatchesError..');
}
tradesBuy.saveTradeSearchError=function(){
	console.error("trades -saveTradeSearchError");
}

tradesBuy.getTradeSearchesError=function(){
	console.error('trades - getTradeSearchesError..');
}
tradesBuy.buyerPaymentError=function(){
	console.error('trades - buyerPaymentError..');
}
tradesBuy.sellerPaymentError=function(){
	console.error('trades - sellerPaymentError..');
}


tradesBuy.tradeMatchDateSuggest=function(){
	console.error('trades - tradeMatchDateSuggest..');
}

tradesBuy.suggestTradeMatchDateError=function(){
	console.error('trades - suggestTradeMatchDateError..');
}

tradesBuy.editTradeMatches=function(){
	console.error('trades - editTradeMatches..');
}


tradesBuy.canEditTradeMatchError=function(){
	console.error('trades - canEditTradeMatchError..');
}







