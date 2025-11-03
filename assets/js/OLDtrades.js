if (!tradeDebug){
	var tradeDebug=true;
}
var trades={};

trades.activeTrade;
trades.activeMatch;
trades.searches;
trades.buyMatches;
trades.sellMatches;

trades.getTradeSearches=function(data){
	var command={"object":"trades","method":"getTradeSearches","data":data};
	connection.send(JSON.stringify(command));
}

trades.tradeSearches=function(data,onSuccess,onFailure){
	trades.searches=data[0];

	for (var j in trades.searches){
		trades.searches[j].buyMatches=[];
		trades.searches[j].sellMatches=[];
	}



	

	trades.drawHaveWant();

	trades.drawWantHave();

}





trades.saveTradeSearch=function(type){
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


	trades.getTradeSearches(user.data.session);
	trades.getTradeMatches(user.data.session);
}




trades.drawHaveWant=function(){
	var html="";
	for(var i=0;i<trades.searches.length;i++){
		var dateAdded=moment(trades.searches[i].dateAdded);
		//html+="<tr><td><button onclick=\"location.href='tradeMatches.html?tradeSearchId=" + trades.searches[i].tradeSearchId + "';\">View Matches</button></td>";
		
		
		
		if (trades.searches[i].amountHave>0){

			var haveCurrency=trades.searches[i].have;
			
			var wantCurrency=trades.searches[i].want;
			var haveValueINUSD=trades.searches[i].amountHave/exchangeRates[trades.searches[i].have].rate;
			if (wantCurrency=='usd'){
				var wantValue=haveValueINUSD;
			
			} else{
				var wantValue=haveValueINUSD/exchangeRates[trades.searches[i].want].inverseRate;
			}

			wantValue=wantValue.toFixed(3);
			html+=`			<tr class="border-bottom border-200"  onclick="trades.activeTrade=trades.searches[`+i+`];pages.go('wizardSellPage','',true);">`;
			html+=`				<td>`;
			html+=`					<div class="d-flex flex-grow-1 align-items-center position-relative">`;
			html+=`						<img src="assets/img/flags/`+trades.searches[i].have+`.png" width="40" height="25" alt="" >`; 
			html+=`						<div class="flex-1 ms-3">`;
			html+=`							<h6 class="mb-1 fw-semi-bold">`+trades.searches[i].amountHave+` ` +trades.searches[i].have.toUpperCase()+`</h6>`;					
			html+=`						</div>`;
			html+=`					</div>`;
			html+=`				</td>`;
			html+=`				<td></td>`;
			html+=`				<td>`;
			html+=`					<div class="d-flex flex-grow-1 align-items-center position-relative">`;
			html+=`						<img src="assets/img/flags/`+trades.searches[i].want+`.png" width="40" height="25" alt="" >`; 
			html+=`						<div class="flex-1 ms-3">`;
			html+=`							<h6 class="mb-1 fw-semi-bold">`+parseInt(wantValue) + ` ` +trades.searches[i].want.toUpperCase()+`</h6>`;
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




trades.getTradeMatches=function(data, onSuccess, onFailure){
	//console.log('getTradeMatches')
	var command={"object":"trades","method":"getBuyTradeMatches","data":data};
	//console.log(command); 	
	connection.send(JSON.stringify(command));
	command={"object":"trades","method":"getSellTradeMatches","data":data};
	//console.log(command);
	connection.send(JSON.stringify(command));
}



trades.sellTradeMatches=function(data){
	trades.sellMatches=data;
	trades.sellSearchMerge();
}
trades.sellSearchMerge=function(){
	if (!trades.searches || !trades.sellMatches){console.log("no data"); return;}
	for (var h in trades.searches){
		trades.searches[h].sellMatches=[];
	}

	for (var i in trades.sellMatches){
		
		for (var j in trades.searches){
			if (trades.sellMatches[i].sellerTradeSearchId== trades.searches[j].tradeSearchId){
				trades.searches[j].sellMatches.push(trades.sellMatches[i]);
				break;
			}
		}
	}
	
	trades.drawSellTradeMatches();
}

trades.drawSellTradeMatches=function(){
	if (!trades.activeTrade || !trades.activeTrade.sellMatches){
		//console.log('no active trade');
		return;
	}
	document.getElementById("sellTradeMatchTable").innerHTML="";
	var showButtons=true;
	var html="";
	
	for (var i=0;i<trades.activeTrade.sellMatches.length;i++){
		html+=`<tr><td>`;
		if (!trades.activeTrade.sellMatches[i].buyerStatus){
			html+=`<button class="btn btn-primary" onclick="trades.matchTrade('`+trades.activeTrade.sellMatches[i].sellerTradeSearchId+`','`+trades.activeTrade.sellMatches[i].buyTradeSearchId+`','seller');" >Contact</button>`;
			
		} else if (trades.activeTrade.sellMatches[i].buyerStatus=="pending acceptance"){
			//html+=`You: Waiting for Buyer<BR>`;
			html+=`Buyer: `+ trades.activeTrade.sellMatches[i].buyerStatus;

			//console.log('a',trades.activeTrade)
			//console.log(trades.activeTrade.sellMatches[i].tradeMatchId);
			//html+=`<input type="button" onclick="trades.acceptTrade('`+trades.activeTrade.sellMatches[i].tradeMatchId+`',"seller");" value="Accept">`;
			//html+=` <input type="button" onclick="trades.rejectTrade('`+trades.activeTrade.sellMatches[i].tradeMatchId+`',"seller");" value="Reject">`;
			


		} else if (trades.activeTrade.sellMatches[i].sellerStatus=="pending acceptance"){
		
			//console.log('a',trades.activeTrade)
			//console.log(trades.activeTrade.sellMatches[i].tradeMatchId);
			html+=`<input type="button" onclick="trades.acceptTrade('`+trades.activeTrade.sellMatches[i].tradeMatchId+`','seller');" value="Accept">`;
			html+=` <input type="button" onclick="trades.rejectTrade('`+trades.activeTrade.sellMatches[i].tradeMatchId+`','seller');" value="Reject">`;
			


		}
		
		else if (trades.activeTrade.sellMatches[i].sellerStatus == "pending payment"){
			html+=`<button class="btn btn-primary" onclick="iam='seller';tradeMatchId='`+trades.activeTrade.sellMatches[i].tradeMatchId+`'" type="button" data-bs-toggle="modal" data-bs-target="#payment-modal" >Pay $1</button>`;
			showButtons=false;
		} else if (trades.activeTrade.sellMatches[i].buyerStatus == "pending payment"){
			html+=`Buyer: `+ trades.activeTrade.sellMatches[i].buyerStatus;
			html+=`<br>You: `+ trades.activeTrade.sellMatches[i].sellerStatus;
			showButtons=false;
		} else if (trades.activeTrade.sellMatches[i].sellerStatus == "paid" && trades.activeTrade.sellMatches[i].buyerStatus == "paid"){
			html+=`<input type="button" class="btn btn-success" onclick="trades.activeMatch=trades.activeTrade.sellMatches[`+i+`];pages.go('scheduleMeetup');" value="Schedule Meetup">`;
			
			
			showButtons=false;
		} else if (trades.activeTrade.sellMatches[i].sellerStatus == "rejected"){
			html+=`Seller: `+ trades.activeTrade.sellMatches[i].sellerStatus;

		} else{
			html+=`Seller: `+ trades.activeTrade.sellMatches[i].sellerStatus +`<BR>Buyer: `+ trades.activeTrade.sellMatches[i].buyerStatus;
			document.getElementById("editSellDeleteBtns").style.display="none";	
		}
		
		
		
		html+=`</td><td>`;
		html+=`<img src="assets/img/flags/`+trades.activeTrade.sellMatches[i].have+`.png" width="40" height="25" alt="" >`; 
			
		html+=`</td><td>`;
		html+=trades.activeTrade.sellMatches[i].firstName;
		html+=`</td><td>`;
		html+=parseInt(trades.activeTrade.sellMatches[i].distance) + ` km`;
		html+=`</td></tr>`;
	}
	if (showButtons){
		document.getElementById("editSellDeleteBtns").style.display="";
	} else{
		document.getElementById("editSellDeleteBtns").style.display="none";
	}
	document.getElementById("sellTradeMatchTable").innerHTML=html;
}












trades.buyTradeMatches=function(data){
	trades.buyMatches=data;
	trades.buySearchMerge();
	//trades.drawBuyTradeMatches();
}
trades.buySearchMerge=function(){
	if (!trades.searches || !trades.buyMatches){ return;}
	for (var k in trades.searches){
		trades.searches[k].buyMatches=[];
	}
	for (var i in trades.buyMatches){
		for (var j in trades.searches){
			if (trades.buyMatches[i].buyTradeSearchId== trades.searches[j].tradeSearchId){
			
				trades.searches[j].buyMatches.push(trades.buyMatches[i]);
				break;
			}
		}
	}
	
	trades.drawBuyTradeMatches();
}













trades.drawWantHave=function(){
	var html="";
	for(var i=0;i<trades.searches.length;i++){
		var dateAdded=moment(trades.searches[i].dateAdded);
		//html+="<tr><td><button onclick=\"location.href='tradeMatches.html?tradeSearchId=" + trades.searches[i].tradeSearchId + "';\">View Matches</button></td>";
		
		if (trades.searches[i].amountHave==0){
			var haveCurrency=trades.searches[i].have;
			var wantCurrency=trades.searches[i].want;
			var wantValue;
			if (haveCurrency=='usd'){
				
				var haveValueINUSD=trades.searches[i].amountHave;
			} else{
				var haveValueINUSD=trades.searches[i].amountHave/exchangeRates[trades.searches[i].have].rate;
			
			}
			if (wantCurrency=='usd'){
				wantValue=haveValueINUSD;
			} else{
				wantValue=haveValueINUSD/exchangeRates[trades.searches[i].want].inverseRate;
			}
			

			wantValue=wantValue.toFixed(3);
			html+=`			<tr class="border-bottom border-200"  onclick="trades.activeTrade=trades.searches[`+i+`];pages.go('wizardBuyPage');">`;
			html+=`				<td>`;
			html+=`					<div class="d-flex flex-grow-1 align-items-center position-relative">`;
			html+=`						<img src="assets/img/flags/`+trades.searches[i].want+`.png" width="40" height="25" alt="" >`; 
			html+=`						<div class="flex-1 ms-3">`;
			html+=`							<h6 class="mb-1 fw-semi-bold">` +trades.searches[i].want.toUpperCase()+`</h6>`;				
			html+=`						</div>`;
			html+=`					</div>`;
			html+=`				</td>`;
			html+=`				<td></td>`;
			html+=`				<td>`;
			html+=`					<div class="d-flex flex-grow-1 align-items-center position-relative">`;
			html+=`						<img src="assets/img/flags/`+trades.searches[i].have+`.png" width="40" height="25" alt="" >`; 
			html+=`						<div class="flex-1 ms-3">`;
			html+=`							<h6 class="mb-1 fw-semi-bold">`+trades.searches[i].have.toUpperCase()+`</h6>`;
			html+=`							<p class="fw-semi-bold mb-0 text-500"></p>`;
			html+=`						</div>`;
			html+=`					</div>`;
			html+=`				</td>`;
			
			html+=`			</tr>`;
			
			
			
		}
		
	}
	document.getElementById("wantCurrencyTrades").innerHTML=html;
}

trades.drawTradeSearch=function(){
	console.log("drawTradeSearch")
	if (!trades.activeTrade){ return;}
	var haveCurrency=trades.activeTrade.have;
	var wantCurrency=trades.activeTrade.want;
	if (haveCurrency=='usd'){
		var haveValueINUSD=trades.activeTrade.amountHave;
	} else{
		var haveValueINUSD=trades.activeTrade.amountHave/exchangeRates[trades.activeTrade.have].rate;
	}
	if (wantCurrency=='usd'){
		var wantValue=haveValueINUSD;
	} else{
		var wantValue=haveValueINUSD/exchangeRates[trades.activeTrade.want].inverseRate;
	}

	wantValue=wantValue.toFixed(3);

	if(trades.activeTrade.amountHave){
		amountHave=trades.activeTrade.amountHave
	}else{
		amountHave="";
	}
	console.log(trades.activeTrade)
	document.getElementById("sellTradeHave").innerHTML=amountHave + ` ` +trades.activeTrade.have.toUpperCase() + ` <img src="assets/img/flags/`+trades.activeTrade.have+`.png" width="40" height="25" alt="" >`;
	document.getElementById("sellTradeWant").innerHTML=parseInt(wantValue) + ` ` + trades.activeTrade.want.toUpperCase() + ` <img src="assets/img/flags/`+trades.activeTrade.want+`.png" width="40" height="25" alt="" >`;
	document.getElementById("buyTradeHave").innerHTML=amountHave + ` ` +trades.activeTrade.have.toUpperCase() + ` <img src="assets/img/flags/`+trades.activeTrade.have+`.png" width="40" height="25" alt="" >`;
	document.getElementById("buyTradeWant").innerHTML=parseInt(wantValue) + ` ` + trades.activeTrade.want.toUpperCase() + ` <img src="assets/img/flags/`+trades.activeTrade.want+`.png" width="40" height="25" alt="" >`;
	
}



trades.drawBuyTradeMatches=function(){
	if (!trades.activeTrade || !trades.activeTrade.buyMatches){return;}

//console.log(trades.activeTrade)
	var showButtons=true;
			
	var html="";
	for (var i=0;i<trades.activeTrade.buyMatches.length;i++){


		var wantCurrency=trades.activeTrade.buyMatches[i].want;
		var haveValueINUSD=trades.activeTrade.buyMatches[i].amountHave/exchangeRates[trades.activeTrade.buyMatches[i].have].rate;
		var wantValue=haveValueINUSD/exchangeRates[trades.activeTrade.buyMatches[i].want].inverseRate;
		//if (wantCurrency=='usd'){
		//	var wantValue=haveValueINUSD;					
		//} else{
		//	var wantValue=haveValueINUSD/exchangeRates[trades.activeTrade.buyMatches[i].want].inverseRate;
		//}

		wantValue=parseInt(wantValue);

		html+=`<tr><td>`;
		console.log(trades.activeTrade.buyMatches[i])
		if (!trades.activeTrade.buyMatches[i].buyerStatus){
			html+=`<input type="button" onclick="trades.matchTrade('`+trades.activeTrade.buyMatches[i].sellerTradeSearchId+`','`+trades.activeTrade.buyMatches[i].buyTradeSearchId+`','buyer');" value="Contact">`;
			
		}  else if (trades.activeTrade.buyMatches[i].sellerStatus=="pending acceptance"){
			//html+=`You: Waiting for Buyer<BR>`;
			html+=`Waiting for the Seller to Accept`
			//console.log('a',trades.activeTrade)
			//console.log(trades.activeTrade.buyMatches[i].tradeMatchId);
			//html+=`<input type="button" onclick="trades.acceptTrade('`+trades.activeTrade.buyMatches[i].tradeMatchId+`','buyer');" value="Accept">`;
			//html+=` <input type="button" onclick="trades.rejectTrade('`+trades.activeTrade.buyMatches[i].tradeMatchId+`','buyer');" value="Reject">`;
			


		} else if (trades.activeTrade.buyMatches[i].buyerStatus=="pending acceptance"){
		
			//console.log('a',trades.activeTrade)
			//console.log(trades.activeTrade.buyMatches[i].tradeMatchId);
			html+=`<input type="button" onclick="trades.acceptTrade('`+trades.activeTrade.buyMatches[i].tradeMatchId+`','buyer');" value="Accept">`;
			html+=` <input type="button" onclick="trades.rejectTrade('`+trades.activeTrade.buyMatches[i].tradeMatchId+`','buyer');" value="Reject">`;
			


		}
		
		
		
		
		
		
		
		//else if (trades.activeTrade.buyMatches[i].buyerStatus=="pending acceptance"){
		//	console.log('a',trades.activeTrade)
		//	console.log(trades.activeTrade.buyMatches[i].tradeMatchId);
		//	html+=`<input type="button" onclick="trades.acceptTrade('`+trades.activeTrade.buyMatches[i].tradeMatchId+`','buyer');" value="Accept">`;
		//	html+=` <input type="button" onclick="trades.rejectTrade('`+trades.activeTrade.buyMatches[i].tradeMatchId+`','buyer');" value="Reject">`;
			
		//} 
		else if (trades.activeTrade.buyMatches[i].buyerStatus == "pending payment"){
			html+=`<button class="btn btn-primary" onclick="iam='buyer';tradeMatchId='`+trades.activeTrade.buyMatches[i].tradeMatchId+`'" type="button" data-bs-toggle="modal" data-bs-target="#payment-modal" >Pay $1</button>`;
			showButtons=false;
		} else if (trades.activeTrade.buyMatches[i].sellerStatus == "pending payment"){
			html+=`You: `+ trades.activeTrade.buyMatches[i].buyerStatus;
			html+=`<BR>Seller: `+ trades.activeTrade.buyMatches[i].sellerStatus;
			showButtons=false;
		} else if (trades.activeTrade.buyMatches[i].sellerStatus == "paid" && trades.activeTrade.buyMatches[i].buyerStatus == "paid"){
			html+=`<input type="button" class="btn btn-success" onclick="trades.activeMatch=trades.activeTrade.buyMatches[`+i+`];pages.go('scheduleMeetup');" value="Schedule Meetup">`;
			
			showButtons=false;
		} else if (trades.activeTrade.buyMatches[i].sellerStatus == "rejected"){
			html+=`Seller: `+ trades.activeTrade.buyMatches[i].sellerStatus;

		} else{
			html+=`Seller: `+ trades.activeTrade.buyMatches[i].sellerStatus+`<BR>`;
			html+=`Buyer: `+ trades.activeTrade.buyMatches[i].buyerStatus;
			document.getElementById("editBuyDeleteBtns").style.display="none";	
		}
		html+=`</td><td>`;
		html+=trades.activeTrade.buyMatches[i].amountHave + ` `+trades.activeTrade.buyMatches[i].have.toUpperCase()+` <img src="assets/img/flags/`+trades.activeTrade.buyMatches[i].have+`.png" width="40" height="25" alt="" >`; 
			
		html+=`</td><td>`;
		html+=wantValue + ` `+trades.activeTrade.buyMatches[i].want.toUpperCase()+` <img src="assets/img/flags/`+trades.activeTrade.buyMatches[i].want+`.png" width="40" height="25" alt="" >`; 
		html+=`</td><td>`;
		html+=trades.activeTrade.buyMatches[i].firstName;
		html+=`</td><td>`;
		html+=parseInt(trades.activeTrade.buyMatches[i].distance) + ` km`;
		
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



//trades.getBuyTradeMatches=function(sessionId,tradeSearchId, onSuccess,onTimeout){
//	//var action="getBuyTradeMatches";

//	//var url = basePath + "?action=" + action+"&sessionId="+sessionId +"&tradeSearchId="+tradeSearchId;


//	////console.log("url: " + url);
	
//	//httpget(url,onSuccess,onTimeout);
	
//}


trades.deleteTradeSearch=function(data, onSuccess,onTimeout){
	console.log("DELETE",data);
	//var action="deleteTradeSearch";
	
	//var url = basePath + "?action=" + action+"&sessionId="+sessionId+"&tradeSearchId="+tradeSearchId;


	////console.log("url: " + url);
	
	//httpget(url,onSuccess,onTimeout);
	var data={};
	data.tradeSearchId=trades.activeTrade.tradeSearchId;
	var command={"object":"trades","method":"deleteTradeSearch","data":data};
	console.log(command);
	connection.send(JSON.stringify(command));
}

trades.tradeSearchDeleted=function(data,onSuccess,onFailure){
	trades.getTradeSearches(user.data.session);
	trades.getTradeMatches(user.data.session);
	pages.go('dashboardPage');

	//console.log(data)
	//var newTrades=[]
	//for (var i in trades.searches){
	//	if (data !=trades.searches[i].tradeSearchId){
	//		newTrades.push(trades.searches[i]);
	//	}
	//}
	//trades.searches=newTrades;
	//addresses.draw();
}
//trades.getTradeSearch=function(sessionId,tradeSearchId, onSuccess,onTimeout){
//	var action="getTradeSearch";

//	var url = basePath + "?action=" + action+"&sessionId="+sessionId +"&tradeSearchId="+tradeSearchId;


//	//console.log("url: " + url);
	
//	httpget(url,onSuccess,onTimeout);
	
//}

//trades.getTradeMatch=function(sessionId,tradeMatchId, onSuccess,onTimeout){
//	var action="getTradeMatch";

//	var url = basePath + "?action=" + action+"&sessionId="+sessionId +"&tradeMatchId="+tradeMatchId;


//	//console.log("url: " + url);
	
//	httpget(url,onSuccess,onTimeout);
	
//}



trades.matchTrade=function(sellTradeSearchId,buyTradeSearchId,iam,onSuccess,onTimeout){
	
	var data={};
	data.sessionId=user.sessionId;
	data.sellTradeSearchId=sellTradeSearchId;
	data.buyTradeSearchId=buyTradeSearchId;
	data.iam=iam;
	var command={"object":"trades","method":"matchTrade","data":data};
	console.log(command);
	connection.send(JSON.stringify(command));

}
trades.newTradeMatch=function(data,onSuccess,onFailure){
	console.log("newTradeMatch",data);
	
	//trades.getTradeSearches(user.data.session);
	trades.getTradeMatches(user.data.session);
	//trades.drawBuyTradeMatches();
	//trades.drawTradeSearch();
	//trades.drawSellTradeMatches();
	//trades.drawTradeSearch();
}
trades.acceptTrade=function(tradeMatchId,iam,onSuccess,onTimeout){
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
trades.tradeAccepted=function(data,onSuccess,onTimeout){
	console.log("tradeAccepted");
	trades.getTradeMatches(user.data.session);
}
trades.rejectTrade=function(sessionId, tradeMatchId,iam,onSuccess,onTimeout){
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
trades.tradeRejected=function(data,onSuccess,onTimeout){
	console.log("traderejected");
	trades.getTradeMatches(user.data.session);
}

trades.sellerPayment=function(sessionId, tradeMatchId, paypalOrderId, onSuccess,onTimeout){
	var data={};
	data.sessionId=user.sessionId;
	data.tradeMatchId=tradeMatchId;
	data.paypalOrderId=paypalOrderId;
	
	var command={"object":"trades","method":"sellerPayment","data":data};
	connection.send(JSON.stringify(command));
}
trades.buyerPaid=function(data, onSuccess,onTimeout){
	trades.getTradeMatches(user.data.session);
	paymentModal.hide();
}

trades.sellerPaid=function(data, onSuccess,onTimeout){
	trades.getTradeMatches(user.data.session);
	paymentModal.hide();
}

trades.tradeAccepted=function(data,onSuccess,onTimeout){
	console.log("tradeAccepted");
	trades.getTradeMatches(user.data.session);
}


trades.buyerPayment=function(sessionId, tradeMatchId, paypalOrderId, onSuccess,onTimeout){
	var data={};
	data.sessionId=user.sessionId;
	data.tradeMatchId=tradeMatchId;
	data.paypalOrderId=paypalOrderId;
	
	var command={"object":"trades","method":"buyerPayment","data":data};
	connection.send(JSON.stringify(command));
}

trades.suggestTradeMatchDate=function(data,onSuccess){
	var data={};
	
	data.sessionId=user.sessionId;
	data.tradeMatchId=trades.activeMatch.tradeMatchId;
	data.dateTimeSuggest=new Date(document.getElementById("dateSuggest").value + " " + document.getElementById("timeSuggest").value);

	console.log(data);	
	var command={"object":"trades","method":"suggestTradeMatchDate","data":data};
	connection.send(JSON.stringify(command));
}
trades.checkFuture=	function (){
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

trades.tradeSearchId=function(){
	console.error('trades - tradeSearchId..');
}

trades.tradeSearchIdError=function(){
	console.error('trades - tradeSearchIdError..');
}
trades.tradeSearchSaved=function(){
	console.log('trades - tradeSearchSaved..');
}
trades.tradeSearchError=function(){
	console.error('trades - tradeSearchError..');
}

trades.tradeSearchDeleteError=function(){
	console.error('trades - tradeSearchDeleteError..');
}
trades.insertMatchError=function(){
	console.error('trades - insertMatchError..');
}
trades.acceptTradeError=function(){
	console.error('trades - acceptTradeError..');
}
trades.rejectTradeError=function(){
	console.error('trades - rejectTradeError..');
}
trades.adminTradeSearches=function(){
	console.error('trades - adminTradeSearches..');
}
trades.adminGetTradeSearchesError=function(){
	console.error('trades - adminGetTradeSearchesError..');
}
trades.adminTradeMatches=function(){
	console.error('trades - adminTradeMatches..');
}
trades.adminGetTradeMatchesError=function(){
	console.error('trades - adminGetTradeMatchesError..');
}
trades.saveTradeSearchError=function(){
	console.error("trades -saveTradeSearchError");
}

trades.getTradeSearchesError=function(){
	console.error('trades - getTradeSearchesError..');
}
trades.buyerPaymentError=function(){
	console.error('trades - buyerPaymentError..');
}
trades.sellerPaymentError=function(){
	console.error('trades - sellerPaymentError..');
}


trades.tradeMatchDateSuggest=function(){
	console.error('trades - tradeMatchDateSuggest..');
}

trades.suggestTradeMatchDateError=function(){
	console.error('trades - suggestTradeMatchDateError..');
}

trades.editTradeMatches=function(){
	console.error('trades - editTradeMatches..');
}


trades.canEditTradeMatchError=function(){
	console.error('trades - canEditTradeMatchError..');
}







