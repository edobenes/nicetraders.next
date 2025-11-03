
var wizard={};

wizard.form;
wizard.init=function(wizardDiv, mapDiv){



	maps.initMap(mapDiv);
	wizard.wizardDiv = document.getElementById(wizardDiv);
	wizard.tabPillEl = document.querySelectorAll('#pill-tab2 [data-bs-toggle="pill"]');
	wizard.tabProgressBar = document.querySelector('.theme-wizard .progress');
	wizard.tabToggleButtonEl = wizard.wizardDiv.querySelectorAll('[data-wizard-step]');
	wizard.form = wizard.wizardDiv.querySelector('[novalidate]');
	wizard.nextButton = wizard.wizardDiv.querySelector('.next button');
	wizard.prevButton = wizard.wizardDiv.querySelector('.previous button');
	wizard.cardFooter = wizard.wizardDiv.querySelector('.theme-wizard .card-footer');
	wizard.prevButton.classList.add('d-none'); // on button click tab change
	

	wizard.resetForm();
	


	wizard.progress();
	
	wizard.populateForm();
	//if (wizard.tabPillEl.length) {
	//	//console.log("test")
	//	var dividedProgressbar = 100 / wizard.tabPillEl.length;
	//	wizard.tabProgressBar.querySelector('.progress-bar').style.width = "".concat(dividedProgressbar, "%");
	//	wizard.tabPillEl.forEach(function (item, index) {
	//		item.addEventListener('show.bs.tab', function () {
	//			wizard.wizardDiv.tabProgressBar.querySelector('.progress-bar').style.width = "".concat(dividedProgressbar * (index + 1), "%");
	//		});
	//	});
	//}
	

}

wizard.resetForm=function(){
	//reset form:
	document.getElementById("currencySell-currencyHave").value="";
	document.getElementById("currencySell-tradeSearchId").value="";
	document.getElementById("currencySell-amount").value="";
	document.getElementById("currencySell-currencyWant").value="";
	document.getElementById('currencySell-distance').value="10";
	document.getElementById("currencySell-lat").value="";
	document.getElementById("currencySell-lng").value="";

	document.getElementById("currencyBuy-currencyHave").value="";
	document.getElementById("currencyBuy-tradeSearchId").value="";
	document.getElementById("currencyBuy-currencyWant").value="";
	document.getElementById('currencyBuy-distance').value="10";
	document.getElementById("currencyBuy-lat").value="";
	document.getElementById("currencyBuy-lng").value="";

	wizard.step = 0;
}
wizard.populateForm=function(){


	

	if (!trades.activeTrade.tradeSearchId){
		return;
	}
	
	if (trades.activeTrade.amountHave>0){
		//sell trade
		document.getElementById("currencySell-currencyHave").value=trades.activeTrade.have.toUpperCase();
		document.getElementById("currencySell-tradeSearchId").value=trades.activeTrade.tradeSearchId;
		document.getElementById("currencySell-amount").value=trades.activeTrade.amountHave;
		document.getElementById("currencySell-currencyWant").value=trades.activeTrade.want.toUpperCase();
		document.getElementById('currencySell-distance').value=trades.activeTrade.distanceWillingToTravel;
		document.getElementById("currencySell-lat").value=trades.activeTrade.lat
		document.getElementById("currencySell-lng").value=trades.activeTrade.lng
		
		
		$('#currencySell-currencyHave').trigger('change.select2');
		$('#currencySell-currencyWant').trigger('change.select2');
		maps.moveToLocation(trades.activeTrade.lat, trades.activeTrade.lng);

		wizard.step=3;
		wizard.nextSellTab();
	} else{
		//buy trade
		
		document.getElementById("currencyBuy-currencyHave").value=trades.activeTrade.have.toUpperCase();
		document.getElementById("currencyBuy-tradeSearchId").value=trades.activeTrade.tradeSearchId;
		document.getElementById("currencyBuy-currencyWant").value=trades.activeTrade.want.toUpperCase();
		document.getElementById('currencyBuy-distance').value=trades.activeTrade.distanceWillingToTravel;
		document.getElementById("currencyBuy-lat").value=trades.activeTrade.lat
		document.getElementById("currencyBuy-lng").value=trades.activeTrade.lng
		
		
		$('#currencyBuy-currencyHave').trigger('change.select2');
		$('#currencyBuy-currencyWant').trigger('change.select2');
		maps.moveToLocation(trades.activeTrade.lat, trades.activeTrade.lng);

		wizard.step=3;
		wizard.nextBuyTab();

	}
		
	
	
}

wizard.nextSellTab=function(){
	var isVerified=false;

	if (wizard.step==0){
		isVerified=true;

		

		//for debugging
		if (trades.activeTrade.have && trades.activeTrade.have.length){
			document.getElementById("currencySell-currencyHave").value=trades.activeTrade.have.toUpperCase();
			document.getElementById("currencySell-tradeSearchId").value=trades.activeTrade.tradeSearchId;
			$('#currencySell-currencyHave').trigger('change.select2');
			document.getElementById("currencySell-amount").value=trades.activeTrade.amountHave;
			document.getElementById("currencySell-currencyWant").value=trades.activeTrade.want.toUpperCase();
			$('#currencySell-currencyWant').trigger('change.select2');
			document.getElementById('currencySell-distance').value=trades.activeTrade.distanceWillingToTravel;
			//document.getElementById("currencySell-addressId").value=trades.activeTrade.have
			document.getElementById("currencySell-lat").value=trades.activeTrade.lat
			document.getElementById("currencySell-lng").value=trades.activeTrade.lng
			maps.moveToLocation(trades.activeTrade.lat, trades.activeTrade.lng);
		} else{
			wizard.chooseAddress(0);	
		}
		



	} else if (wizard.step==1){
		wizard.validateFormElement(document.getElementById("currencySell-currencyHave"));
		wizard.validateFormElement(document.getElementById("currencySell-amount"));
		isVerified=wizard.formValid("currencySellForm1");
	} else if (wizard.step==2){
		//console.log("verify currency want");
		wizard.validateFormElement(document.getElementById("currencySell-currencyWant"));
		isVerified=wizard.formValid("currencySellForm2");
	} else if (wizard.step==3){
		//console.log("verify location");
		wizard.validateFormElement(document.getElementById("currencySell-addressId"));
		wizard.validateFormElement(document.getElementById("currencySell-distance"));
		isVerified=wizard.formValid("currencySellForm3");
		if (isVerified){
			trades.saveTradeSearch('sell');
		}
	} else if (wizard.step==4){
		//console.log("verify location");
		
		isVerified=true;
		
	}
	if (isVerified){
		wizard.nextTab();
	}
}

wizard.nextBuyTab=function(){
	
	var isVerified=false;
	if (wizard.step==0){
		isVerified=true;


		if (trades.activeTrade.have && trades.activeTrade.have.length){
			console.log("old");
			document.getElementById("currencyBuy-currencyHave").value=trades.activeTrade.have.toUpperCase();
			document.getElementById("currencyBuy-tradeSearchId").value=trades.activeTrade.tradeSearchId;
			$('#currencyBuy-currencyHave').trigger('change.select2');
			document.getElementById("currencyBuy-currencyWant").value=trades.activeTrade.want.toUpperCase();
			$('#currencyBuy-currencyWant').trigger('change.select2');
			document.getElementById('currencyBuy-distance').value=trades.activeTrade.distanceWillingToTravel;
			//document.getElementById("currencySell-addressId").value=trades.activeTrade.have
			document.getElementById("currencyBuy-lat").value=trades.activeTrade.lat
			document.getElementById("currencyBuy-lng").value=trades.activeTrade.lng
			maps.moveToLocation(trades.activeTrade.lat, trades.activeTrade.lng);
		} else{
			console.log("new");
			wizard.chooseAddress(0);	
		}


	} else if (wizard.step==1){
		wizard.validateFormElement(document.getElementById("currencyBuy-currencyWant"));
		isVerified=wizard.formValid("currencyBuyForm1");
		
	} else if (wizard.step==2){
		wizard.validateFormElement(document.getElementById("currencyBuy-currencyHave"));
		//validateFormElement(document.getElementById("amount"));
		isVerified=wizard.formValid("currencyBuyForm2");
	} else if (wizard.step==3){
		wizard.validateFormElement(document.getElementById("currencyBuy-addressId"));
		wizard.validateFormElement(document.getElementById("currencyBuy-distance"));
		isVerified=wizard.formValid("currencyBuyForm3");
		if (isVerified){
			trades.saveTradeSearch('buy');
		}
	}  else if (wizard.step==4){
		
		
		isVerified=true;
		
	}
	if (isVerified){
		wizard.nextTab();
	}
}


wizard.nextTab= function() {
	console.log("nextSellTab",wizard.step);
	wizard.step += 1;
	var tab = new window.bootstrap.Tab(wizard.tabToggleButtonEl[wizard.step]);
	tab.show();
};
wizard.previousTab= function() {
	wizard.step -= 1;
	var tab = new window.bootstrap.Tab(wizard.tabToggleButtonEl[wizard.step]);
	tab.show();
};


wizard.progress=function(){
	if (wizard.tabToggleButtonEl.length) {
		wizard.tabToggleButtonEl.forEach(function (item, index) {
			/* eslint-disable */
			item.addEventListener("show.bs.tab", function (e) {
			

				step = index; // can't go back tab

			//  if (step === wizard.tabToggleButtonEl.length - 1) {
			//    wizard.tabToggleButtonEl.forEach(function (tab) {
			//      tab.setAttribute('data-bs-toggle', 'modal');
			//      tab.setAttribute('data-bs-target', '#error-modal');
			//    });
			//  } //add done class


				for (var i = 0; i < step; i += 1) {
					wizard.tabToggleButtonEl[i].classList.add('done');
				} //remove done class


				for (var j = step; j < wizard.tabToggleButtonEl.length; j += 1) {
					wizard.tabToggleButtonEl[j].classList.remove('done');
				} // card footer remove at last step


				if (step > wizard.tabToggleButtonEl.length - 2) {
					item.classList.add('done');
					wizard.cardFooter.classList.add('d-none');
				} else {
					wizard.cardFooter.classList.remove('d-none');
				} // prev-button removing


				if (step > 0) {
					wizard.prevButton.classList.remove('d-none');
				} else {
					wizard.prevButton.classList.add('d-none');
				}
			});
		});
	}
}

wizard.validateFormElement=function (element){
	if(!element.checkValidity()){
		element.classList.add('is-invalid');
		return 'is-invalid'
	} else{
		element.classList.remove('is-invalid');
		element.classList.add('invalid');
		return 'valid'
	}
}

wizard.formValid=function (formId, onSuccess){
	wizard.form=document.getElementById(formId);
	if (!wizard.form.checkValidity()) {
		wizard.form.classList.add('is-invalid');
		return false;
	} else{
		wizard.form.classList.add('was-validated');
		if (onSuccess){
			onSuccess();
		}
		return true;
	}
}


var currencyHave;
var currencyWant;
var amount;
wizard.convertValue=function (){
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




wizard.chooseAddress=function (num){	
	addressNumber=num;

	document.getElementById("currencySell-addressId").value=addresses.data[addressNumber].addressId;
	document.getElementById("currencySell-lat").value=addresses.data[addressNumber].lat;
	document.getElementById("currencySell-lng").value=addresses.data[addressNumber].lng;

	document.getElementById("currencyBuy-addressId").value=addresses.data[addressNumber].addressId;
	document.getElementById("currencyBuy-lat").value=addresses.data[addressNumber].lat;
	document.getElementById("currencyBuy-lng").value=addresses.data[addressNumber].lng;
	addressPosition = {lat :addresses.data[addressNumber].lat, lng :addresses.data[addressNumber].lng}
	maps.moveToLocation(addresses.data[addressNumber].lat, addresses.data[addressNumber].lng);
	
}