
tradesSell={};
tradesSell.activeMatch;
tradesSell.searches;
tradesSell.buyMatches;
tradesSell.sellMatches;
tradesSell.addressNumber="";

tradesSell.getTradeSearches=function(data){
	console.log("tradesSell.getTradeSearches");
	var command={"object":"trades","method":"getTradeSearches","data":data};
	connection.send(JSON.stringify(command));
}

tradesSell.tradeSearches=function(data,onSuccess,onFailure){
	console.log("tradesSell.tradeSearches");
	tradesSell.searches=data[0];

	for (var j in tradesSell.searches){
		tradesSell.searches[j].buyMatches=[];
		tradesSell.searches[j].sellMatches=[];
	}

	tradesSell.drawHaveWant();
	tradesSell.drawWantHave();

}

tradesSell.resetActiveTrade=function(){
	// console.log("tradesSell.resetActiveTrade");
	tradesSell.activeTrade={'sessionId':user.sessionId,'tradeSearchId':'','have':'','amountHave':'','want':'','distanceWillingToTravel':10,'lat':38.9072,'lng':-77.0369};
}
tradesSell.init=function(){

	var urlParams = new URLSearchParams(window.location.search);
	tradesSell.activeTrade.tradeSearchId = urlParams.get("tradeSearchId");
	console.log("moonman",tradesSell.activeTrade.tradeSearchId)
	if (!tradesSell.activeTrade.tradeSearchId){
		tradesSell.activeTrade.tradeSearchId="";
	}

	
	if (tradesSell.activeTrade.tradeSearchId.length){
		//tradesSell.activeTrade=
	}

	maps.initMap('currencySell');
	
	if (tradesSell.activeTrade.have.length){
		tradesSell.activeTrade.have=tradesSell.activeTrade.have.toUpperCase();
	}
	if (tradesSell.activeTrade.want.length){
		tradesSell.activeTrade.want=tradesSell.activeTrade.want.toUpperCase();
	}
	document.getElementById("currencySell-currencyHave").value=tradesSell.activeTrade.have;
	document.getElementById("currencySell-tradeSearchId").value=tradesSell.activeTrade.tradeSearchId;
	document.getElementById("currencySell-amount").value=tradesSell.activeTrade.amountHave;
	document.getElementById("currencySell-currencyWant").value=tradesSell.activeTrade.want;
	document.getElementById('currencySell-distance').value=tradesSell.activeTrade.distanceWillingToTravel;
	document.getElementById("currencySell-lat").value=tradesSell.activeTrade.lat
	document.getElementById("currencySell-lng").value=tradesSell.activeTrade.lng
	
	
	$('#currencySell-currencyHave').trigger('change.select2');
	$('#currencySell-currencyWant').trigger('change.select2');
	maps.moveToLocation(tradesSell.activeTrade.lat, tradesSell.activeTrade.lng);
	tradesSell.drawAddresses();
}

tradesSell.populateForm=function(){
	console.log("tradesSell.populateForm");


	
	














	//fix this for editing a trade
	tradesSell.step=0;
















	
	tradesSell.init('wizardSell',tradesSell.step);
}

tradesSell.validateFormElement=function (element){
	if(!element.checkValidity()){
		element.classList.add('is-invalid');
		return 'is-invalid'
	} else{
		element.classList.remove('is-invalid');
		element.classList.add('invalid');
		return 'valid'
	}
}

tradesSell.formValid=function (formId, onSuccess){
	tradesSell.form=document.getElementById(formId);
	if (!tradesSell.form.checkValidity()) {
		tradesSell.form.classList.add('is-invalid');
		return false;
	} else{
		tradesSell.form.classList.add('was-validated');
		if (onSuccess){
			onSuccess();
		}
		return true;
	}
}

var currencyHave;
var currencyWant;
var amount;
tradesSell.convertValue=function (){
	currencyHave=document.getElementById("currencySell-currencyHave").value.toLowerCase();
	currencyWant=document.getElementById("currencySell-currencyWant").value.toLowerCase();
	amount=document.getElementById("currencySell-amount").value.replace(/[^0-9]/g, '');
	if (currencyHave=="usd"){
		amountInUSD=amount;
	} else{
		if (exchangeRates[currencyHave]){
			amountInUSD=exchangeRates[currencyHave].inverseRate*amount;
		} else{
			amountInUSD=-1;
		}
	}
	
	if (currencyWant=="usd"){
		amountInWant=amountInUSD;
	} else{
		if (exchangeRates[currencyWant]){
			amountInWant=exchangeRates[currencyWant].rate*amountInUSD;
		} else{
			amountInWant=-1;
		}
	}
	
	document.getElementById("currencySell-currencyWant").style.display;
	document.getElementById("currencySell-wantType").innerHTML=currencyWant;
	document.getElementById("currencySell-haveType").innerHTML=currencyHave;
	document.getElementById("currencySell-convertedValue").innerHTML=amountInWant;
		
}
tradesSell.saveActiveTrade=function(page,nextPage){
	console.log("tradesSell.saveActiveTrade",page);
	var isVerified=false;
	if (page =='tradeSellPage1'){
		
	}
	else if (page =='tradeSellPage2'){
		tradesSell.validateFormElement(document.getElementById("currencySell-currencyHave"));
		tradesSell.validateFormElement(document.getElementById("currencySell-currencyWant"));
		tradesSell.validateFormElement(document.getElementById("currencySell-amount"));
		isVerified=tradesSell.formValid("currencySellForm1");
		
		if (isVerified){
			tradesSell.activeTrade.have=document.getElementById("currencySell-currencyHave").value;
			tradesSell.activeTrade.want=document.getElementById("currencySell-currencyWant").value;
			tradesSell.activeTrade.amountHave=document.getElementById("currencySell-amount").value.replace(/[^0-9]/g, '');
			
			
		}
	}
	else if (page =='tradeSellPage3'){
		tradesSell.validateFormElement(document.getElementById("currencySell-addressId"));
		tradesSell.validateFormElement(document.getElementById("currencySell-distance"));
		isVerified=tradesSell.formValid("currencySellForm3");
		if (isVerified){
			tradesSell.activeTrade.addressId=document.getElementById("currencySell-addressId").value;
			tradesSell.activeTrade.distance=document.getElementById("currencySell-distance").value;
			tradesSell.activeTrade.lat=document.getElementById("currencySell-lat").value;
			tradesSell.activeTrade.lng=document.getElementById("currencySell-lng").value;
			// console.log(tradesSell.activeTrade)
			pages.go('tradeSellPage4');
		}
	}
	else if (page =='tradeSellPage4'){
		

	}

	var command={"object":"trades","method":"saveTradeSearch","data":tradesSell.activeTrade};
	connection.send(JSON.stringify(command), function(command){
		console.log(command);
		pages.go(nextPage,'tradeSearchId='+command.data.tradeSearchId,false);
	});

}
// tradesSell.verify=function(page){
// 	var verified=false;

// 	console.log("tradesSell.verify",page);

// 	if (page =='tradeSellPage1'){
// 		pages.go('tradeSellPage2');
// 	}
// 	else if (page =='tradeSellPage2'){
// 		tradesSell.validateFormElement(document.getElementById("currencySell-currencyHave"));
// 		tradesSell.validateFormElement(document.getElementById("currencySell-currencyWant"));
// 		tradesSell.validateFormElement(document.getElementById("currencySell-amount"));
// 		isVerified=tradesSell.formValid("currencySellForm2");
// 		console.log(isVerified);
// 		if (isVerified){
// 			pages.go('tradeSellPage3');
// 		}
// 	}
// 	else if (page =='tradeSellPage3'){
// 		tradesSell.validateFormElement(document.getElementById("currencySell-addressId"));
// 		tradesSell.validateFormElement(document.getElementById("currencySell-distance"));
// 		isVerified=tradesSell.formValid("currencySellForm3");
// 		if (isVerified){
// 			pages.go('tradeSellPage4');
// 			//trades.saveTradeSearch('sell');
// 		}
		
// 	}
// 	else if (page =='tradeSellPage4'){

// 		pages.go('tradeSellPage5');
// 	}
// 	else if (page =='tradeSellPage5'){
// 		pages.go('tradeSellPage6');
// 	}
// 	else if (page =='tradeSellPage6'){

// 	}
	
// }


// tradesSell.isVerified=function(){
// 	console.log("tradesSell.isVerified");
// 	var isVerified=false;
// 	console.log(tradesSell.step);
	
// 	if (tradesSell.step==0){
// 		isVerified=true;

		
// 	}
// 	else if (tradesSell.step==1){
// 		tradesSell.validateFormElement(document.getElementById("currencySell-currencyHave"));
// 		tradesSell.validateFormElement(document.getElementById("currencySell-amount"));
// 		isVerified=tradesSell.formValid("currencySellForm1");
		
// 		//for debugging
// 			//document.getElementById("currencySell-currencyHave").value=tradesSell.activeTrade.have.toUpperCase();			
// 			//document.getElementById("currencySell-tradeSearchId").value=tradesSell.activeTrade.tradeSearchId;
// 			//$('#currencySell-currencyHave').trigger('change.select2');
// 			//document.getElementById("currencySell-amount").value=tradesSell.activeTrade.amountHave;
// 			//document.getElementById("currencySell-currencyWant").value=tradesSell.activeTrade.want.toUpperCase();
// 			//$('#currencySell-currencyWant').trigger('change.select2');
// 			//document.getElementById('currencySell-distance').value=tradesSell.activeTrade.distanceWillingToTravel;
// 			////document.getElementById("currencySell-addressId").value=tradesSell.activeTrade.have
// 			//document.getElementById("currencySell-lat").value=tradesSell.activeTrade.lat
// 			//document.getElementById("currencySell-lng").value=tradesSell.activeTrade.lng
// 			//maps.moveToLocation(tradesSell.activeTrade.lat, tradesSell.activeTrade.lng);
// 	} else{
// 		tradesSell.chooseAddress(0);	
// 	}
		


// 	// else if (tradesSell.step==1){
// 	//	
// 	//} else if (tradesSell.step==2){
// 	//	//console.log("verify currency want");
// 	//	tradesSell.validateFormElement(document.getElementById("currencySell-currencyWant"));
// 	//	isVerified=tradesSell.formValid("currencySellForm2");
// 	//} else if (tradesSell.step==3){
// 	//	//console.log("verify location");
// 	//	tradesSell.validateFormElement(document.getElementById("currencySell-addressId"));
// 	//	tradesSell.validateFormElement(document.getElementById("currencySell-distance"));
// 	//	isVerified=tradesSell.formValid("currencySellForm3");
// 	//	if (isVerified){
// 	//		tradesSell.saveTradeSearch('sell');
// 	//	}
// 	//} else if (tradesSell.step==4){
// 	//	//console.log("verify location");
		
// 	//	isVerified=true;
		
// 	//}
// 	return isVerified;
// }
tradesSell.drawAddresses=function(){
	var chooseAddresseshtml="";

	var firstAddressNum=""
	for (var i in addresses.data){
		if (firstAddressNum.length==0){
			firstAddressNum=i;
		}
		chooseAddresseshtml +="<div style='margin:5px'>";
		chooseAddresseshtml +=` <button  onclick="tradesSell.chooseAddress('`+i+`');return false;" class="btn btn-primary" type="button" data-bs-toggle="tooltip" data-bs-placement="top" title="Edit">Use this Address</button> `;
		chooseAddresseshtml +=addresses.data[i].address1 + " " ;
		if (addresses.data[i].address2.length){
			chooseAddresseshtml+=addresses.data[i].address2 + " ";						
		}
		chooseAddresseshtml+=  addresses.data[i].city +" " + addresses.data[i].state +  " "+ addresses.data[i].zip +" "+ addresses.data[i].country;
		chooseAddresseshtml+="</div>";
		

	}
	document.getElementById("currencySell-addresses").innerHTML=chooseAddresseshtml;
	if (tradesSell.activeTrade.tradeSearchId.length==0 && firstAddressNum.length>0){
		// console.log("GOOOO");
		tradesSell.chooseAddress(firstAddressNum);
	}
}
tradesSell.chooseAddress=function (num){
	// console.log("tradesSell.chooseAddress", num);	
	tradesSell.addressNumber=num;

	document.getElementById("currencySell-addressId").value=addresses.data[tradesSell.addressNumber].addressId;
	document.getElementById("currencySell-lat").value=addresses.data[tradesSell.addressNumber].lat;
	document.getElementById("currencySell-lng").value=addresses.data[tradesSell.addressNumber].lng;

	if (tradesSell.addressNumber.length>0){
		maps.moveToLocation(addresses.data[tradesSell.addressNumber].lat, addresses.data[tradesSell.addressNumber].lng);
	}
}
tradesSell.initMap=function(){

}
tradesSell.nextTab=function(){
	console.log("tradesSell.nextTab");
	if(!tradesSell.isVerified()){
		console.error("not verified");
		return false;
	}
	tradesSell.nextTab();
}

tradesSell.previousTab=function(){
	console.log("tradesSell.previousTab");
	
	tradesSell.previousTab();
}
tradesSell.saveTradeSearch=function(type){
	console.log("tradesSell.saveTradeSearch");
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


	tradesSell.getTradeSearches(user.data.session);
	tradesSell.getTradeMatches(user.data.session);
}




tradesSell.drawHaveWant=function(){
	console.log("tradesSell.drawHaveWant");
	var html="";
	for(var i=0;i<tradesSell.searches.length;i++){
		var dateAdded=moment(tradesSell.searches[i].dateAdded);
		//html+="<tr><td><button onclick=\"location.href='tradeMatches.html?tradeSearchId=" + tradesSell.searches[i].tradeSearchId + "';\">View Matches</button></td>";
		
		
		
		if (tradesSell.searches[i].amountHave>0){

			var haveCurrency=tradesSell.searches[i].have;
			
			var wantCurrency=tradesSell.searches[i].want;
			var haveValueINUSD=tradesSell.searches[i].amountHave/exchangeRates[tradesSell.searches[i].have].rate;
			if (wantCurrency=='usd'){
				var wantValue=haveValueINUSD;
			
			} else{
				var wantValue=haveValueINUSD/exchangeRates[tradesSell.searches[i].want].inverseRate;
			}

			wantValue=wantValue.toFixed(3);
			html+=`			<tr class="border-bottom border-200"  onclick="tradesSell.activeTrade=tradesSell.searches[`+i+`];pages.go('wizardSellPage','',true);">`;
			html+=`				<td>`;
			html+=`					<div class="d-flex flex-grow-1 align-items-center position-relative">`;
			html+=`						<img src="assets/img/flags/`+tradesSell.searches[i].have+`.png" width="40" height="25" alt="" >`; 
			html+=`						<div class="flex-1 ms-3">`;
			html+=`							<h6 class="mb-1 fw-semi-bold">`+tradesSell.searches[i].amountHave+` ` +tradesSell.searches[i].have.toUpperCase()+`</h6>`;					
			html+=`						</div>`;
			html+=`					</div>`;
			html+=`				</td>`;
			html+=`				<td></td>`;
			html+=`				<td>`;
			html+=`					<div class="d-flex flex-grow-1 align-items-center position-relative">`;
			html+=`						<img src="assets/img/flags/`+tradesSell.searches[i].want+`.png" width="40" height="25" alt="" >`; 
			html+=`						<div class="flex-1 ms-3">`;
			html+=`							<h6 class="mb-1 fw-semi-bold">`+parseInt(wantValue) + ` ` +tradesSell.searches[i].want.toUpperCase()+`</h6>`;
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




tradesSell.getTradeMatches=function(data, onSuccess, onFailure){
	console.log("tradesSell.getTradeMatches");
	//console.log('getTradeMatches')
	var command={"object":"trades","method":"getBuyTradeMatches","data":data};
	//console.log(command); 	
	connection.send(JSON.stringify(command));
	command={"object":"trades","method":"getSellTradeMatches","data":data};
	//console.log(command);
	connection.send(JSON.stringify(command));
}



tradesSell.sellTradeMatches=function(data){
	console.log("tradesSell.sellTradeMatches");
	tradesSell.sellMatches=data;
	tradesSell.sellSearchMerge();
}
tradesSell.sellSearchMerge=function(){
	console.log("tradesSell.sellSearchMerge");
	if (!tradesSell.searches || !tradesSell.sellMatches){console.log("no data"); return;}
	for (var h in tradesSell.searches){
		tradesSell.searches[h].sellMatches=[];
	}

	for (var i in tradesSell.sellMatches){
		
		for (var j in tradesSell.searches){
			if (tradesSell.sellMatches[i].sellerTradeSearchId== tradesSell.searches[j].tradeSearchId){
				tradesSell.searches[j].sellMatches.push(tradesSell.sellMatches[i]);
				break;
			}
		}
	}
	
	tradesSell.drawSellTradeMatches();
}

tradesSell.drawSellTradeMatches=function(){
	console.log("tradesSell.drawSellTradeMatches");
	if (!tradesSell.activeTrade || !tradesSell.activeTrade.sellMatches){
		//console.log('no active trade');
		return;
	}
	document.getElementById("sellTradeMatchTable").innerHTML="";
	var showButtons=true;
	var html="";
	
	for (var i=0;i<tradesSell.activeTrade.sellMatches.length;i++){
		html+=`<tr><td>`;
		if (!tradesSell.activeTrade.sellMatches[i].buyerStatus){
			html+=`<button class="btn btn-primary" onclick="tradesSell.matchTrade('`+tradesSell.activeTrade.sellMatches[i].sellerTradeSearchId+`','`+tradesSell.activeTrade.sellMatches[i].buyTradeSearchId+`','seller');" >Contact</button>`;
			
		} else if (tradesSell.activeTrade.sellMatches[i].buyerStatus=="pending acceptance"){
			//html+=`You: Waiting for Buyer<BR>`;
			html+=`Buyer: `+ tradesSell.activeTrade.sellMatches[i].buyerStatus;

			//console.log('a',tradesSell.activeTrade)
			//console.log(tradesSell.activeTrade.sellMatches[i].tradeMatchId);
			//html+=`<input type="button" onclick="tradesSell.acceptTrade('`+tradesSell.activeTrade.sellMatches[i].tradeMatchId+`',"seller");" value="Accept">`;
			//html+=` <input type="button" onclick="tradesSell.rejectTrade('`+tradesSell.activeTrade.sellMatches[i].tradeMatchId+`',"seller");" value="Reject">`;
			


		} else if (tradesSell.activeTrade.sellMatches[i].sellerStatus=="pending acceptance"){
		
			//console.log('a',tradesSell.activeTrade)
			//console.log(tradesSell.activeTrade.sellMatches[i].tradeMatchId);
			html+=`<input type="button" onclick="tradesSell.acceptTrade('`+tradesSell.activeTrade.sellMatches[i].tradeMatchId+`','seller');" value="Accept">`;
			html+=` <input type="button" onclick="tradesSell.rejectTrade('`+tradesSell.activeTrade.sellMatches[i].tradeMatchId+`','seller');" value="Reject">`;
			


		}
		
		else if (tradesSell.activeTrade.sellMatches[i].sellerStatus == "pending payment"){
			html+=`<button class="btn btn-primary" onclick="iam='seller';tradeMatchId='`+tradesSell.activeTrade.sellMatches[i].tradeMatchId+`'" type="button" data-bs-toggle="modal" data-bs-target="#payment-modal" >Pay $1</button>`;
			showButtons=false;
		} else if (tradesSell.activeTrade.sellMatches[i].buyerStatus == "pending payment"){
			html+=`Buyer: `+ tradesSell.activeTrade.sellMatches[i].buyerStatus;
			html+=`<br>You: `+ tradesSell.activeTrade.sellMatches[i].sellerStatus;
			showButtons=false;
		} else if (tradesSell.activeTrade.sellMatches[i].sellerStatus == "paid" && tradesSell.activeTrade.sellMatches[i].buyerStatus == "paid"){
			html+=`<input type="button" class="btn btn-success" onclick="tradesSell.activeMatch=tradesSell.activeTrade.sellMatches[`+i+`];pages.go('scheduleMeetup');" value="Schedule Meetup">`;
			
			
			showButtons=false;
		} else if (tradesSell.activeTrade.sellMatches[i].sellerStatus == "rejected"){
			html+=`Seller: `+ tradesSell.activeTrade.sellMatches[i].sellerStatus;

		} else{
			html+=`Seller: `+ tradesSell.activeTrade.sellMatches[i].sellerStatus +`<BR>Buyer: `+ tradesSell.activeTrade.sellMatches[i].buyerStatus;
			document.getElementById("editSellDeleteBtns").style.display="none";	
		}
		
		
		
		html+=`</td><td>`;
		html+=`<img src="assets/img/flags/`+tradesSell.activeTrade.sellMatches[i].have+`.png" width="40" height="25" alt="" >`; 
			
		html+=`</td><td>`;
		html+=tradesSell.activeTrade.sellMatches[i].firstName;
		html+=`</td><td>`;
		html+=parseInt(tradesSell.activeTrade.sellMatches[i].distance) + ` km`;
		html+=`</td></tr>`;
	}
	if (showButtons){
		document.getElementById("editSellDeleteBtns").style.display="";
	} else{
		document.getElementById("editSellDeleteBtns").style.display="none";
	}
	document.getElementById("sellTradeMatchTable").innerHTML=html;
}












tradesSell.buyTradeMatches=function(data){
	console.log("tradesSell.buyTradeMatches");
	tradesSell.buyMatches=data;
	tradesSell.buySearchMerge();
	//tradesSell.drawBuyTradeMatches();
}
tradesSell.buySearchMerge=function(){
	console.log("tradesSell.buySearchMerge");
	if (!tradesSell.searches || !tradesSell.buyMatches){ return;}
	for (var k in tradesSell.searches){
		tradesSell.searches[k].buyMatches=[];
	}
	for (var i in tradesSell.buyMatches){
		for (var j in tradesSell.searches){
			if (tradesSell.buyMatches[i].buyTradeSearchId== tradesSell.searches[j].tradeSearchId){
			
				tradesSell.searches[j].buyMatches.push(tradesSell.buyMatches[i]);
				break;
			}
		}
	}
	
	tradesSell.drawBuyTradeMatches();
}













tradesSell.drawWantHave=function(){
	console.log("tradesSell.drawWantHave");
	var html="";
	for(var i=0;i<tradesSell.searches.length;i++){
		var dateAdded=moment(tradesSell.searches[i].dateAdded);
		//html+="<tr><td><button onclick=\"location.href='tradeMatches.html?tradeSearchId=" + tradesSell.searches[i].tradeSearchId + "';\">View Matches</button></td>";
		
		if (tradesSell.searches[i].amountHave==0){
			var haveCurrency=tradesSell.searches[i].have;
			var wantCurrency=tradesSell.searches[i].want;
			var wantValue;
			if (haveCurrency=='usd'){
				
				var haveValueINUSD=tradesSell.searches[i].amountHave;
			} else{
				var haveValueINUSD=tradesSell.searches[i].amountHave/exchangeRates[tradesSell.searches[i].have].rate;
			
			}
			if (wantCurrency=='usd'){
				wantValue=haveValueINUSD;
			} else{
				wantValue=haveValueINUSD/exchangeRates[tradesSell.searches[i].want].inverseRate;
			}
			

			wantValue=wantValue.toFixed(3);
			html+=`			<tr class="border-bottom border-200"  onclick="tradesSell.activeTrade=tradesSell.searches[`+i+`];pages.go('wizardBuyPage');">`;
			html+=`				<td>`;
			html+=`					<div class="d-flex flex-grow-1 align-items-center position-relative">`;
			html+=`						<img src="assets/img/flags/`+tradesSell.searches[i].want+`.png" width="40" height="25" alt="" >`; 
			html+=`						<div class="flex-1 ms-3">`;
			html+=`							<h6 class="mb-1 fw-semi-bold">` +tradesSell.searches[i].want.toUpperCase()+`</h6>`;				
			html+=`						</div>`;
			html+=`					</div>`;
			html+=`				</td>`;
			html+=`				<td></td>`;
			html+=`				<td>`;
			html+=`					<div class="d-flex flex-grow-1 align-items-center position-relative">`;
			html+=`						<img src="assets/img/flags/`+tradesSell.searches[i].have+`.png" width="40" height="25" alt="" >`; 
			html+=`						<div class="flex-1 ms-3">`;
			html+=`							<h6 class="mb-1 fw-semi-bold">`+tradesSell.searches[i].have.toUpperCase()+`</h6>`;
			html+=`							<p class="fw-semi-bold mb-0 text-500"></p>`;
			html+=`						</div>`;
			html+=`					</div>`;
			html+=`				</td>`;
			
			html+=`			</tr>`;
			
			
			
		}
		
	}
	document.getElementById("wantCurrencyTrades").innerHTML=html;
}

tradesSell.drawTradeSearch=function(){
	console.log("tradesSell.drawTradeSearch");
	if (!tradesSell.activeTrade){ return;}
	var haveCurrency=tradesSell.activeTrade.have;
	var wantCurrency=tradesSell.activeTrade.want;
	if (haveCurrency=='usd'){
		var haveValueINUSD=tradesSell.activeTrade.amountHave;
	} else{
		var haveValueINUSD=tradesSell.activeTrade.amountHave/exchangeRates[tradesSell.activeTrade.have].rate;
	}
	if (wantCurrency=='usd'){
		var wantValue=haveValueINUSD;
	} else{
		var wantValue=haveValueINUSD/exchangeRates[tradesSell.activeTrade.want].inverseRate;
	}

	wantValue=wantValue.toFixed(3);

	if(tradesSell.activeTrade.amountHave){
		amountHave=tradesSell.activeTrade.amountHave
	}else{
		amountHave="";
	}
	console.log(tradesSell.activeTrade)
	document.getElementById("sellTradeHave").innerHTML=amountHave + ` ` +tradesSell.activeTrade.have.toUpperCase() + ` <img src="assets/img/flags/`+tradesSell.activeTrade.have+`.png" width="40" height="25" alt="" >`;
	document.getElementById("sellTradeWant").innerHTML=parseInt(wantValue) + ` ` + tradesSell.activeTrade.want.toUpperCase() + ` <img src="assets/img/flags/`+tradesSell.activeTrade.want+`.png" width="40" height="25" alt="" >`;
	document.getElementById("buyTradeHave").innerHTML=amountHave + ` ` +tradesSell.activeTrade.have.toUpperCase() + ` <img src="assets/img/flags/`+tradesSell.activeTrade.have+`.png" width="40" height="25" alt="" >`;
	document.getElementById("buyTradeWant").innerHTML=parseInt(wantValue) + ` ` + tradesSell.activeTrade.want.toUpperCase() + ` <img src="assets/img/flags/`+tradesSell.activeTrade.want+`.png" width="40" height="25" alt="" >`;
	
}



tradesSell.drawBuyTradeMatches=function(){
	console.log("tradesSell.drawBuyTradeMatches");
	if (!tradesSell.activeTrade || !tradesSell.activeTrade.buyMatches){return;}

//console.log(tradesSell.activeTrade)
	var showButtons=true;
			
	var html="";
	for (var i=0;i<tradesSell.activeTrade.buyMatches.length;i++){


		var wantCurrency=tradesSell.activeTrade.buyMatches[i].want;
		var haveValueINUSD=tradesSell.activeTrade.buyMatches[i].amountHave/exchangeRates[tradesSell.activeTrade.buyMatches[i].have].rate;
		var wantValue=haveValueINUSD/exchangeRates[tradesSell.activeTrade.buyMatches[i].want].inverseRate;
		//if (wantCurrency=='usd'){
		//	var wantValue=haveValueINUSD;					
		//} else{
		//	var wantValue=haveValueINUSD/exchangeRates[tradesSell.activeTrade.buyMatches[i].want].inverseRate;
		//}

		wantValue=parseInt(wantValue);

		html+=`<tr><td>`;
		console.log(tradesSell.activeTrade.buyMatches[i])
		if (!tradesSell.activeTrade.buyMatches[i].buyerStatus){
			html+=`<input type="button" onclick="tradesSell.matchTrade('`+tradesSell.activeTrade.buyMatches[i].sellerTradeSearchId+`','`+tradesSell.activeTrade.buyMatches[i].buyTradeSearchId+`','buyer');" value="Contact">`;
			
		}  else if (tradesSell.activeTrade.buyMatches[i].sellerStatus=="pending acceptance"){
			//html+=`You: Waiting for Buyer<BR>`;
			html+=`Waiting for the Seller to Accept`
			//console.log('a',tradesSell.activeTrade)
			//console.log(tradesSell.activeTrade.buyMatches[i].tradeMatchId);
			//html+=`<input type="button" onclick="tradesSell.acceptTrade('`+tradesSell.activeTrade.buyMatches[i].tradeMatchId+`','buyer');" value="Accept">`;
			//html+=` <input type="button" onclick="tradesSell.rejectTrade('`+tradesSell.activeTrade.buyMatches[i].tradeMatchId+`','buyer');" value="Reject">`;
			


		} else if (tradesSell.activeTrade.buyMatches[i].buyerStatus=="pending acceptance"){
		
			//console.log('a',tradesSell.activeTrade)
			//console.log(tradesSell.activeTrade.buyMatches[i].tradeMatchId);
			html+=`<input type="button" onclick="tradesSell.acceptTrade('`+tradesSell.activeTrade.buyMatches[i].tradeMatchId+`','buyer');" value="Accept">`;
			html+=` <input type="button" onclick="tradesSell.rejectTrade('`+tradesSell.activeTrade.buyMatches[i].tradeMatchId+`','buyer');" value="Reject">`;
			


		}
		
		
		
		
		
		
		
		//else if (tradesSell.activeTrade.buyMatches[i].buyerStatus=="pending acceptance"){
		//	console.log('a',tradesSell.activeTrade)
		//	console.log(tradesSell.activeTrade.buyMatches[i].tradeMatchId);
		//	html+=`<input type="button" onclick="tradesSell.acceptTrade('`+tradesSell.activeTrade.buyMatches[i].tradeMatchId+`','buyer');" value="Accept">`;
		//	html+=` <input type="button" onclick="tradesSell.rejectTrade('`+tradesSell.activeTrade.buyMatches[i].tradeMatchId+`','buyer');" value="Reject">`;
			
		//} 
		else if (tradesSell.activeTrade.buyMatches[i].buyerStatus == "pending payment"){
			html+=`<button class="btn btn-primary" onclick="iam='buyer';tradeMatchId='`+tradesSell.activeTrade.buyMatches[i].tradeMatchId+`'" type="button" data-bs-toggle="modal" data-bs-target="#payment-modal" >Pay $1</button>`;
			showButtons=false;
		} else if (tradesSell.activeTrade.buyMatches[i].sellerStatus == "pending payment"){
			html+=`You: `+ tradesSell.activeTrade.buyMatches[i].buyerStatus;
			html+=`<BR>Seller: `+ tradesSell.activeTrade.buyMatches[i].sellerStatus;
			showButtons=false;
		} else if (tradesSell.activeTrade.buyMatches[i].sellerStatus == "paid" && tradesSell.activeTrade.buyMatches[i].buyerStatus == "paid"){
			html+=`<input type="button" class="btn btn-success" onclick="tradesSell.activeMatch=tradesSell.activeTrade.buyMatches[`+i+`];pages.go('scheduleMeetup');" value="Schedule Meetup">`;
			
			showButtons=false;
		} else if (tradesSell.activeTrade.buyMatches[i].sellerStatus == "rejected"){
			html+=`Seller: `+ tradesSell.activeTrade.buyMatches[i].sellerStatus;

		} else{
			html+=`Seller: `+ tradesSell.activeTrade.buyMatches[i].sellerStatus+`<BR>`;
			html+=`Buyer: `+ tradesSell.activeTrade.buyMatches[i].buyerStatus;
			document.getElementById("editBuyDeleteBtns").style.display="none";	
		}
		html+=`</td><td>`;
		html+=tradesSell.activeTrade.buyMatches[i].amountHave + ` `+tradesSell.activeTrade.buyMatches[i].have.toUpperCase()+` <img src="assets/img/flags/`+tradesSell.activeTrade.buyMatches[i].have+`.png" width="40" height="25" alt="" >`; 
			
		html+=`</td><td>`;
		html+=wantValue + ` `+tradesSell.activeTrade.buyMatches[i].want.toUpperCase()+` <img src="assets/img/flags/`+tradesSell.activeTrade.buyMatches[i].want+`.png" width="40" height="25" alt="" >`; 
		html+=`</td><td>`;
		html+=tradesSell.activeTrade.buyMatches[i].firstName;
		html+=`</td><td>`;
		html+=parseInt(tradesSell.activeTrade.buyMatches[i].distance) + ` km`;
		
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



//tradesSell.getBuyTradeMatches=function(sessionId,tradeSearchId, onSuccess,onTimeout){
//	//var action="getBuyTradeMatches";

//	//var url = basePath + "?action=" + action+"&sessionId="+sessionId +"&tradeSearchId="+tradeSearchId;


//	////console.log("url: " + url);
	
//	//httpget(url,onSuccess,onTimeout);
	
//}


tradesSell.deleteTradeSearch=function(data, onSuccess,onTimeout){
	console.log("tradesSell.deleteTradeSearch",data);
	//var action="deleteTradeSearch";
	
	//var url = basePath + "?action=" + action+"&sessionId="+sessionId+"&tradeSearchId="+tradeSearchId;


	////console.log("url: " + url);
	
	//httpget(url,onSuccess,onTimeout);
	var data={};
	data.tradeSearchId=tradesSell.activeTrade.tradeSearchId;
	var command={"object":"trades","method":"deleteTradeSearch","data":data};
	console.log(command);
	connection.send(JSON.stringify(command));
}

tradesSell.tradeSearchDeleted=function(data,onSuccess,onFailure){
	console.log("tradesSell.tradeSearchDeleted");
	tradesSell.getTradeSearches(user.data.session);
	tradesSell.getTradeMatches(user.data.session);
	pages.go('dashboardPage');

	//console.log(data)
	//var newTrades=[]
	//for (var i in tradesSell.searches){
	//	if (data !=tradesSell.searches[i].tradeSearchId){
	//		newtradesSell.push(tradesSell.searches[i]);
	//	}
	//}
	//tradesSell.searches=newTrades;
	//addresses.draw();
}
//tradesSell.getTradeSearch=function(sessionId,tradeSearchId, onSuccess,onTimeout){
//	var action="getTradeSearch";

//	var url = basePath + "?action=" + action+"&sessionId="+sessionId +"&tradeSearchId="+tradeSearchId;


//	//console.log("url: " + url);
	
//	httpget(url,onSuccess,onTimeout);
	
//}

//tradesSell.getTradeMatch=function(sessionId,tradeMatchId, onSuccess,onTimeout){
//	var action="getTradeMatch";

//	var url = basePath + "?action=" + action+"&sessionId="+sessionId +"&tradeMatchId="+tradeMatchId;


//	//console.log("url: " + url);
	
//	httpget(url,onSuccess,onTimeout);
	
//}



tradesSell.matchTrade=function(sellTradeSearchId,buyTradeSearchId,iam,onSuccess,onTimeout){
	
	var data={};
	data.sessionId=user.sessionId;
	data.sellTradeSearchId=sellTradeSearchId;
	data.buyTradeSearchId=buyTradeSearchId;
	data.iam=iam;
	var command={"object":"trades","method":"matchTrade","data":data};
	console.log(command);
	connection.send(JSON.stringify(command));

}
tradesSell.newTradeMatch=function(data,onSuccess,onFailure){
	console.log("newTradeMatch",data);
	
	//tradesSell.getTradeSearches(user.data.session);
	tradesSell.getTradeMatches(user.data.session);
	//tradesSell.drawBuyTradeMatches();
	//tradesSell.drawTradeSearch();
	//tradesSell.drawSellTradeMatches();
	//tradesSell.drawTradeSearch();
}
tradesSell.acceptTrade=function(tradeMatchId,iam,onSuccess,onTimeout){
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
tradesSell.tradeAccepted=function(data,onSuccess,onTimeout){
	console.log("tradeAccepted");
	tradesSell.getTradeMatches(user.data.session);
}
tradesSell.rejectTrade=function(sessionId, tradeMatchId,iam,onSuccess,onTimeout){
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
tradesSell.tradeRejected=function(data,onSuccess,onTimeout){
	console.log("traderejected");
	tradesSell.getTradeMatches(user.data.session);
}

tradesSell.sellerPayment=function(sessionId, tradeMatchId, paypalOrderId, onSuccess,onTimeout){
	var data={};
	data.sessionId=user.sessionId;
	data.tradeMatchId=tradeMatchId;
	data.paypalOrderId=paypalOrderId;
	
	var command={"object":"trades","method":"sellerPayment","data":data};
	connection.send(JSON.stringify(command));
}
tradesSell.buyerPaid=function(data, onSuccess,onTimeout){
	tradesSell.getTradeMatches(user.data.session);
	paymentModal.hide();
}

tradesSell.sellerPaid=function(data, onSuccess,onTimeout){
	tradesSell.getTradeMatches(user.data.session);
	paymentModal.hide();
}

tradesSell.tradeAccepted=function(data,onSuccess,onTimeout){
	console.log("tradeAccepted");
	tradesSell.getTradeMatches(user.data.session);
}


tradesSell.buyerPayment=function(sessionId, tradeMatchId, paypalOrderId, onSuccess,onTimeout){
	var data={};
	data.sessionId=user.sessionId;
	data.tradeMatchId=tradeMatchId;
	data.paypalOrderId=paypalOrderId;
	
	var command={"object":"trades","method":"buyerPayment","data":data};
	connection.send(JSON.stringify(command));
}

tradesSell.suggestTradeMatchDate=function(data,onSuccess){
	var data={};
	
	data.sessionId=user.sessionId;
	data.tradeMatchId=tradesSell.activeMatch.tradeMatchId;
	data.dateTimeSuggest=new Date(document.getElementById("dateSuggest").value + " " + document.getElementById("timeSuggest").value);

	console.log(data);	
	var command={"object":"trades","method":"suggestTradeMatchDate","data":data};
	connection.send(JSON.stringify(command));
}
tradesSell.checkFuture=	function (){
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

tradesSell.tradeSearchId=function(){
	console.error('trades - tradeSearchId..');
}

tradesSell.tradeSearchIdError=function(){
	console.error('trades - tradeSearchIdError..');
}
tradesSell.tradeSearchSaved=function(){
	console.log('trades - tradeSearchSaved..');
}
tradesSell.tradeSearchError=function(){
	console.error('trades - tradeSearchError..');
}

tradesSell.tradeSearchDeleteError=function(){
	console.error('trades - tradeSearchDeleteError..');
}
tradesSell.insertMatchError=function(){
	console.error('trades - insertMatchError..');
}
tradesSell.acceptTradeError=function(){
	console.error('trades - acceptTradeError..');
}
tradesSell.rejectTradeError=function(){
	console.error('trades - rejectTradeError..');
}
tradesSell.adminTradeSearches=function(){
	console.error('trades - adminTradeSearches..');
}
tradesSell.adminGetTradeSearchesError=function(){
	console.error('trades - adminGetTradeSearchesError..');
}
tradesSell.adminTradeMatches=function(){
	console.error('trades - adminTradeMatches..');
}
tradesSell.adminGetTradeMatchesError=function(){
	console.error('trades - adminGetTradeMatchesError..');
}
tradesSell.saveTradeSearchError=function(){
	console.error("trades -saveTradeSearchError");
}

tradesSell.getTradeSearchesError=function(){
	console.error('trades - getTradeSearchesError..');
}
tradesSell.buyerPaymentError=function(){
	console.error('trades - buyerPaymentError..');
}
tradesSell.sellerPaymentError=function(){
	console.error('trades - sellerPaymentError..');
}


tradesSell.tradeMatchDateSuggest=function(){
	console.error('trades - tradeMatchDateSuggest..');
}

tradesSell.suggestTradeMatchDateError=function(){
	console.error('trades - suggestTradeMatchDateError..');
}

tradesSell.editTradeMatches=function(){
	console.error('trades - editTradeMatches..');
}


tradesSell.canEditTradeMatchError=function(){
	console.error('trades - canEditTradeMatchError..');
}








