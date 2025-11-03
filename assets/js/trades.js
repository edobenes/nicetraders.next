trades={};
trades.activeTrade;
trades.searches=[];
trades.matches=[];
trades.match={};
trades.addressNumber="";
trades.isLoaded=false;


trades.resetActiveTrade=function(data){
	// console.log("trades.resetActiveTrade",data);
	
	var type=data.type;
	trades.activeTrade={'sessionId':user.sessionId,'tradeSearchId':'','addressId':'','have':'','amountHave':'','want':'','distanceWillingToTravel':10,'lat':38.9072,'lng':-77.0369};
	if (data.type){
		trades.activeTrade.type=data.type;
	} else if (trades.activeTrade.tradeSearchId==''){
		trades.activeTrade.type="sell";
	}

	if (trades.activeTrade.type=="sell"){
		document.getElementById("amountIHaveDiv").style.display="";

	}else{
		document.getElementById("amountIHaveDiv").style.display="none";
	}
}

trades.setActiveTrade=function(data,onSuccess){
	// console.log("trades.setActiveTrade",data);
	if (!data.tradeSearchId){
		console.log("no tradeId")
		var tradeSearchId="";
	} else{
		var tradeSearchId=data.tradeSearchId;
	}
	
	if (!trades.activeTrade || trades.activeTrade.tradeSearchId != tradeSearchId){
		trades.resetActiveTrade(data);
	}
	
	var foundit=false
	for(var i=0;i<trades.searches.length;i++){
		if (data.tradeSearchId==trades.searches[i].tradeSearchId){
			foundit=true;
			trades.activeTrade=trades.searches[i];
			break;
		}
	}
	
	for (var i in trades.matches){
		console.log(trades.matches[i].sellTradeSearchId)
		if (trades.activeTrade.type=="sell" && trades.matches[i].sellTradeSearchId== trades.activeTrade.tradeSearchId){
			trades.activeTrade.match=trades.matches[i];
		} else if (trades.activeTrade.type=="buy" && trades.matches[i].buyTradeSearchId== trades.activeTrade.tradeSearchId){
			trades.activeTrade.match=trades.matches[i];
		}
	}

	if (tradeSearchId.length && !foundit){
		console.log("empty tradeid",tradeSearchId,foundit)
		pages.go(pages.defaultPage);
		return;
	}
	
	
	if (trades.activeTrade.have.length){
		trades.activeTrade.have=trades.activeTrade.have.toUpperCase();
	}
	if (trades.activeTrade.want.length){
		trades.activeTrade.want=trades.activeTrade.want.toUpperCase();
	}

	document.getElementById("currency-currencyHave").value=trades.activeTrade.have;
	document.getElementById("currency-tradeSearchId").value=trades.activeTrade.tradeSearchId;
	document.getElementById("currency-addressId").value=trades.activeTrade.addressId;
	document.getElementById("currency-amountHave").value=trades.activeTrade.amountHave;
	document.getElementById("currency-currencyWant").value=trades.activeTrade.want;
	document.getElementById('currency-distance').value=trades.activeTrade.distanceWillingToTravel;
	document.getElementById("currency-lat").value=trades.activeTrade.lat
	document.getElementById("currency-lng").value=trades.activeTrade.lng
	

	if (trades.activeTrade.match){
		if (trades.activeTrade.type=="sell"){
			document.getElementById("scheduleSellName").innerHTML=user.data.user.firstName;
			document.getElementById("scheduleSellBring").innerHTML=trades.activeTrade.amountHave + " " +trades.activeTrade.have;
		
			document.getElementById("scheduleBuyName").innerHTML=trades.activeTrade.match.buyerFirstName;
			document.getElementById("scheduleBuyBring").innerHTML= trades.activeTrade.wantValue+ " " + trades.activeTrade.want;
			
		} else{
			document.getElementById("scheduleSellName").innerHTML=trades.activeTrade.match.sellerFirstName;
			document.getElementById("scheduleBuyBring").innerHTML=trades.activeTrade.amountHave + " " +trades.activeTrade.have;

			document.getElementById("scheduleBuyName").innerHTML=user.data.user.firstName;
			document.getElementById("scheduleSellBring").innerHTML=trades.activeTrade.wantValue + " " + trades.activeTrade.have;
			
		}
		trades.drawSuggestedDate();
	}

	
	$('#currency-currencyHave').trigger('change.select2');
	$('#currency-currencyWant').trigger('change.select2');

	
	// console.log("trades.setActiveTrade DONE",data);
	// console.log("trades.setActiveTrade",trades.activeTrade);
	if (onSuccess){
		// console.log("success")
		onSuccess();
	}
}

trades.drawAddresses=function(data,onSuccess){
	// console.log("drawwadd",addresses.data);
	if (!trades.activeTrade){
		return;
	}
	var chooseAddresseshtml="";

	var firstAddressNum=""
	
	//console.log(addresses)
	var counter=0;

	checkedAddressId=""
	for (var i in addresses.data){
		if (firstAddressNum.length==0){
			firstAddressNum=i;
		}
		chooseAddresseshtml +=`<div class="form-check" >`;
		chooseAddresseshtml +=` <input name="addressId" type="radio" `;
		if (addresses.data[i].addressId == trades.activeTrade.addressId || counter==0){
			chooseAddresseshtml +=`checked="true"`;
			checkedAddressId=addresses.data[i].addressId;
		}
		chooseAddresseshtml +=` onclick="console.log('checked!');trades.chooseAddress('`+i+`');" class="form-check-input" value="`+addresses.data[i].addressId+`" id="address-`+addresses.data[i].addressId+`"> `;
		chooseAddresseshtml +=`<label class="form-check-label"  for="address-`+addresses.data[i].addressId+`">`
		chooseAddresseshtml +=addresses.data[i].address1 + " " ;
		if (addresses.data[i].address2.length){
			chooseAddresseshtml+=addresses.data[i].address2 + " ";						
		}
		chooseAddresseshtml+=  addresses.data[i].city +" " + addresses.data[i].state +  " "+ addresses.data[i].zip +" "+ addresses.data[i].country;
		chooseAddresseshtml+=`</label>`;
		chooseAddresseshtml+=`</div>`;
		
		counter++
	}
	// console.log("address-"+checkedAddressId);
	if (checkedAddressId && checkedAddressId.length){
		//document.getElementById("address-"+checkedAddressId).click()
	}
	document.getElementById("currency-addresses").innerHTML=chooseAddresseshtml;
	if (trades.activeTrade.tradeSearchId.length==0 && firstAddressNum.length>0){
		trades.chooseAddress(firstAddressNum);
	}

}


trades.getTradeSearches=function(data,onSuccess){
	var command={"object":"trades","method":"getTradeSearches","data":data};
	connection.send(JSON.stringify(command),onSuccess);
	console.log("getTradeSearches",command)

}

trades.tradeSearches=function(data,onSuccess,onFailure){
	

	if (data){
	    trades.searches=data.tradeSearches;
	    trades.matches=data.tradeMatches;
		
		
		if (trades.activeTrade){
			trades.setActiveTrade(trades.activeTrade);
		}
		
		console.log("searches",trades.searches);
		console.log("matches",trades.matches);
		for (var j in trades.searches){
			trades.searches[j].matches=[];

			for (var i in trades.matches){

				if (trades.searches[j].type=="sell" && trades.matches[i].sellTradeSearchId== trades.searches[j].tradeSearchId){
					trades.searches[j].matches.push(trades.matches[i]);
					break;
				} else if (trades.searches[j].type=="buy" && trades.matches[i].buyTradeSearchId== trades.searches[j].tradeSearchId){
					trades.searches[j].matches.push(trades.matches[i]);
					break;
				}


			}
		}
		if (trades.activeTrade){
			for (var i in trades.matches){
				if (trades.activeTrade.type=="sell" && trades.matches[i].sellTradeSearchId== trades.activeTrade.tradeSearchId){
					trades.activeTrade.match=trades.matches[i];
				} else if (trades.activeTrade.type=="buy" && trades.matches[i].buyTradeSearchId== trades.activeTrade.tradeSearchId){
					trades.activeTrade.match=trades.matches[i];
				}
			}
		}

		for (var i =0; i <trades.searches.length;i++){
			if (!trades.searches[i].tradeSearchId || trades.searches[i].tradeSearchId.length==0){
				trades.searches[i].page="tradePage1";
				trades.searches[i].queryString="";
			}
			if (trades.searches[i].have.length==0 || trades.searches[i].want.length==0 || trades.searches[i].addressId.length==0){
				trades.searches[i].page="tradePage1";
				trades.searches[i].queryString="";
			}
			if (trades.searches[i].have.length>0 && trades.searches[i].want.length>0 && trades.searches[i].addressId.length>0){
				trades.searches[i].page="tradePage3";
				trades.searches[i].queryString="tradeSearchId="+trades.searches[i].tradeSearchId;
			}
			if (trades.searches[i].have.length>0 && trades.searches[i].want.length>0 && trades.searches[i].addressId.length>0){
				trades.searches[i].page="tradePage3";
				trades.searches[i].queryString="tradeSearchId="+trades.searches[i].tradeSearchId;
			}
		}
	}


	var havehtml="";
	var wanthtml="";
	for(var i=0;i<trades.searches.length;i++){
		var dateAdded=moment(trades.searches[i].dateAdded);
		
		if (trades.searches[i].type=='sell'){
			if (!trades.searches[i].have || !trades.searches[i].want || !trades.searches[i].amountHave){
				continue;
			}


			
			var haveValueINUSD=trades.searches[i].amountHave/exchangeRates[trades.searches[i].have.toLowerCase()].rate;
			if (trades.searches[i].want.toLowerCase()=='usd'){
				var wantValue=haveValueINUSD;
			} else{
				var wantValue=haveValueINUSD/exchangeRates[trades.searches[i].want.toLowerCase()].inverseRate;
			}

			wantValue=wantValue.toFixed(3);
			trades.searches[i].wantValue=wantValue;
			havehtml+=`			<tr class="border-bottom border-200"  onclick="pages.go('`+trades.searches[i].page+`','tradeSearchId=`+trades.searches[i].tradeSearchId+`');">`;
			havehtml+=`				<td>`;
			havehtml+=`					<div class="d-flex flex-grow-1 align-items-center position-relative">`;
			havehtml+=`						<img src="assets/img/flags/`+trades.searches[i].have.toLowerCase()+`.png" width="40" height="25" alt="" >`; 
			havehtml+=`						<div class="flex-1 ms-3">`;
			havehtml+=`							<h6 class="mb-1 fw-semi-bold">`+trades.searches[i].amountHave+` ` +trades.searches[i].have.toUpperCase()+`</h6>`;					
			havehtml+=`						</div>`;
			havehtml+=`					</div>`;
			havehtml+=`				</td>`;
			havehtml+=`				<td></td>`;
			havehtml+=`				<td>`;
			havehtml+=`					<div class="d-flex flex-grow-1 align-items-center position-relative">`;
			havehtml+=`						<img src="assets/img/flags/`+trades.searches[i].want.toLowerCase()+`.png" width="40" height="25" alt="" >`; 
			havehtml+=`						<div class="flex-1 ms-3">`;
			havehtml+=`							<h6 class="mb-1 fw-semi-bold">`+parseInt(wantValue) + ` ` +trades.searches[i].want.toUpperCase()+`</h6>`;
			havehtml+=`							<p class="fw-semi-bold mb-0 text-500"></p>`;
			havehtml+=`						</div>`;
			havehtml+=`					</div>`;
			havehtml+=`				</td>`;	
			havehtml+=`			</tr>`;
			
			
			
		} else 	if (trades.searches[i].type=='buy'){

			// if (!trades.searches[i].have || !trades.searches[i].want || !trades.searches[i].amountHave){
			// 	continue;
			// }
	
	
			
			// var haveValueINUSD=trades.searches[i].amountHave/exchangeRates[trades.searches[i].have.toLowerCase()].rate;
			// if (trades.searches[i].want.toLowerCase()=='usd'){
			// 	var wantValue=haveValueINUSD;
			
			// } else{
			// 	var wantValue=haveValueINUSD/exchangeRates[trades.searches[i].want.toLowerCase()].inverseRate;
			// }
	
			// haveValue=haveValue.toFixed(3);
			wanthtml+=`			<tr class="border-bottom border-200"  onclick="pages.go('`+trades.searches[i].page+`','tradeSearchId=`+trades.searches[i].tradeSearchId+`');">`;
			wanthtml+=`				<td>`;
			wanthtml+=`					<div class="d-flex flex-grow-1 align-items-center position-relative">`;
			wanthtml+=`						<img src="assets/img/flags/`+trades.searches[i].have.toLowerCase()+`.png" width="40" height="25" alt="" >`; 
			wanthtml+=`						<div class="flex-1 ms-3">`;
			wanthtml+=`							<h6 class="mb-1 fw-semi-bold">` +trades.searches[i].have.toUpperCase()+`</h6>`;					
			wanthtml+=`						</div>`;
			wanthtml+=`					</div>`;
			wanthtml+=`				</td>`;
			wanthtml+=`				<td></td>`;
			wanthtml+=`				<td>`;
			wanthtml+=`					<div class="d-flex flex-grow-1 align-items-center position-relative">`;
			wanthtml+=`						<img src="assets/img/flags/`+trades.searches[i].want.toLowerCase()+`.png" width="40" height="25" alt="" >`; 
			wanthtml+=`						<div class="flex-1 ms-3">`;
			wanthtml+=`							<h6 class="mb-1 fw-semi-bold">`+trades.searches[i].want.toUpperCase()+`</h6>`;
			wanthtml+=`							<p class="fw-semi-bold mb-0 text-500"></p>`;
			wanthtml+=`						</div>`;
			wanthtml+=`					</div>`;
			wanthtml+=`				</td>`;	
			wanthtml+=`			</tr>`;
			
			
			
		}
		
		
	} 
	document.getElementById("haveCurrencyTrades").innerHTML=havehtml;
	document.getElementById("wantCurrencyTrades").innerHTML=wanthtml;
	//console.log(html);

	
	
	trades.drawTradeMatches();

}





trades.drawTradeMatches=function(data, onSuccess){
	console.log("trades.drawTradeMatches5",trades.activeTrade);
	
	trades.isLoaded=true;
	// console.log(trades.activeTrade);
	if (!trades.activeTrade){
		// console.log("no active trade?");
		return;
	}
	document.getElementById("sellTradeMatchTable").innerHTML="";
	var showNext=true;
	var showButtons=true;
	var html="";
	if (trades.activeTrade.matches && trades.activeTrade.matches.length>0){
		for (var i=0;i<trades.activeTrade.matches.length;i++){
			html+=`<tr><td>`;


			if (trades.activeTrade.type=="sell"){


				if (!trades.activeTrade.matches[i].buyerStatus){
					console.log("match 1")
					showNext=false;
					html+=`<button class="btn btn-primary" onclick="trades.matchTrade('`+trades.activeTrade.matches[i].sellTradeSearchId+`','`+trades.activeTrade.matches[i].buyTradeSearchId+`','seller');" >Contact</button>`;
					
				} else if (trades.activeTrade.matches[i].buyerStatus=="pending acceptance"){
					console.log("match 2")
					showNext=false;
					//html+=`You: Waiting for Buyer<BR>`;
					html+=`Buyer: `+ trades.activeTrade.matches[i].buyerStatus;

					//console.log('a',trades.activeTrade)
					//console.log(trades.activeTrade.matches[i].tradeMatchId);
					//html+=`<input type="button" onclick="trades.acceptTrade('`+trades.activeTrade.matches[i].tradeMatchId+`',"seller");" value="Accept">`;
					//html+=` <input type="button" onclick="trades.rejectTrade('`+trades.activeTrade.matches[i].tradeMatchId+`',"seller");" value="Reject">`;
					


				} else if (trades.activeTrade.matches[i].sellerStatus=="pending acceptance"){
					console.log("match 3")
					showNext=false;
					//console.log('a',trades.activeTrade)
					//console.log(trades.activeTrade.matches[i].tradeMatchId);
					html+=`<button class="btn btn-primary"  onclick="trades.acceptTrade('`+trades.activeTrade.matches[i].tradeMatchId+`','seller');" >Accept</button>`;
					html+=` <button class="btn btn-primary" onclick="trades.rejectTrade('`+trades.activeTrade.matches[i].tradeMatchId+`','seller');" >Reject</button>`;
					


				}
				
				else if (trades.activeTrade.matches[i].sellerStatus == "pending payment"){
					console.log("match 4")
					showNext=false;
					html+=`<button class="btn btn-primary" onclick="iam='seller';tradeMatchId='`+trades.activeTrade.matches[i].tradeMatchId+`'" type="button" data-bs-toggle="modal" data-bs-target="#payment-modal" >Pay $1</button>`;
					showButtons=false;
				} else if (trades.activeTrade.matches[i].buyerStatus == "pending payment"){
					console.log("match 5")
					showNext=true;
					html+=`Buyer: `+ trades.activeTrade.matches[i].buyerStatus;
					html+=`<br>You: `+ trades.activeTrade.matches[i].sellerStatus;
					showButtons=false;
				} else if (trades.activeTrade.matches[i].sellerStatus == "paid" && trades.activeTrade.matches[i].buyerStatus == "paid"){
					
					console.log("match 6")
					showNext=true;
					html+=`<input type="button" class="btn btn-success" onclick="trades.activeTrade=trades.activeTrade.matches[`+i+`];pages.go('scheduleMeetup');" value="Schedule Meetup">`;
					showButtons=false;
				} else if (trades.activeTrade.matches[i].sellerStatus == "rejected"){
					console.log("match 7")
					showNext=false;
					html+=`Seller: `+ trades.activeTrade.matches[i].sellerStatus;

				} else{
					console.log("match 8")
					showNext=false;
					html+=`Seller: `+ trades.activeTrade.matches[i].sellerStatus +`<BR>Buyer: `+ trades.activeTrade.matches[i].buyerStatus;
					document.getElementById("editSellDeleteBtns").style.display="none";	
				}
				var firstName=trades.activeTrade.matches[i].buyerFirstName;
			} else if (trades.activeTrade.type="buy"){
				console.log("match BUY")
				if (!trades.activeTrade.matches[i].buyerStatus){
					showNext=false;
					
					html+=`<input class="btn btn-primary" onclick="trades.matchTrade('`+trades.activeTrade.matches[i].sellTradeSearchId+`','`+trades.activeTrade.matches[i].buyTradeSearchId+`','buyer');" value="Contact">`;
					
				}  else if (trades.activeTrade.matches[i].sellerStatus=="pending acceptance"){
					showNext=false;
					//html+=`You: Waiting for Buyer<BR>`;
					html+=`Waiting for the Seller to Accept`
					//console.log('a',trades.activeTrade)
					//console.log(trades.activeTrade.matches[i].tradeMatchId);
					//html+=`<input type="button" onclick="trades.acceptTrade('`+trades.activeTrade.matches[i].tradeMatchId+`','buyer');" value="Accept">`;
					//html+=` <input type="button" onclick="trades.rejectTrade('`+trades.activeTrade.matches[i].tradeMatchId+`','buyer');" value="Reject">`;
					
		
		
				} else if (trades.activeTrade.matches[i].buyerStatus=="pending acceptance"){
					showNext=false;
					//console.log('a',trades.activeTrade)
					//console.log(trades.activeTrade.matches[i].tradeMatchId);
					html+=`<input type="button" onclick="trades.acceptTrade('`+trades.activeTrade.matches[i].tradeMatchId+`','buyer');" value="Accept">`;
					html+=` <input type="button" onclick="trades.rejectTrade('`+trades.activeTrade.matches[i].tradeMatchId+`','buyer');" value="Reject">`;
					
		
		
				}
				
				
				
				
				
				
				
				//else if (trades.activeTrade.matches[i].buyerStatus=="pending acceptance"){
				//	console.log('a',trades.activeTrade)
				//	console.log(trades.activeTrade.matches[i].tradeMatchId);
				//	html+=`<input type="button" onclick="trades.acceptTrade('`+trades.activeTrade.matches[i].tradeMatchId+`','buyer');" value="Accept">`;
				//	html+=` <input type="button" onclick="trades.rejectTrade('`+trades.activeTrade.matches[i].tradeMatchId+`','buyer');" value="Reject">`;
					
				//} 
				else if (trades.activeTrade.matches[i].buyerStatus == "pending payment"){
					showNext=false;
					
					html+=`<button class="btn btn-primary" onclick="iam='buyer';tradeMatchId='`+trades.activeTrade.matches[i].tradeMatchId+`'" type="button" data-bs-toggle="modal" data-bs-target="#payment-modal" >Pay $1</button>`;
					showButtons=false;
				} else if (trades.activeTrade.matches[i].sellerStatus == "pending payment"){
					showNext=true;
					html+=`You: `+ trades.activeTrade.matches[i].buyerStatus;
					html+=`<BR>Seller: `+ trades.activeTrade.matches[i].sellerStatus;
					showButtons=false;
				} else if (trades.activeTrade.matches[i].sellerStatus == "paid" && trades.activeTrade.matches[i].buyerStatus == "paid"){
					showNext=true;
					html+=`Next: Schedule a time and location to meetup`
					// html+=`<input type="button" class="btn btn-success" onclick="trades.activeTrade=trades.activeTrade.matches[`+i+`];pages.go('scheduleMeetup');" value="Schedule Meetup">`;
					
					showButtons=false;
				} else if (trades.activeTrade.matches[i].sellerStatus == "rejected"){
					showNext=false;
					html+=`Seller: `+ trades.activeTrade.matches[i].sellerStatus;
		
				} else{
					showNext=false;
					html+=`Seller: `+ trades.activeTrade.matches[i].sellerStatus+`<BR>`;
					html+=`Buyer: `+ trades.activeTrade.matches[i].buyerStatus;
					document.getElementById("editBuyDeleteBtns").style.display="none";	
				}
				var firstName=trades.activeTrade.matches[i].sellerFirstName;
			}
			
			
			html+=`</td><td>`;
			html+=`<img src="assets/img/flags/`+trades.activeTrade.want.toLowerCase()+`.png" width="40" height="25" alt="" >`; 
			html+=`</td><td>`;
			html+=firstName;
			html+=`</td><td>`;
			html+=parseInt(trades.activeTrade.matches[i].distance) + ` km`;
			html+=`</td></tr>`;
		}
		
		
		document.getElementById("sellTradeMatchTable").innerHTML=html;
		document.getElementById("foundMatches").style.display="";
		document.getElementById("noMatches").style.display="none";
		
		
	} 
	
	
	
	else{
		showNext=false;
		document.getElementById("foundMatches").style.display="none";
		document.getElementById("noMatches").style.display="";
		document.getElementById("page3NextButton").style.display="none";

		
		
		
		
		
	}
	if (showButtons){
			
		document.getElementById("editSellDeleteBtns").style.display="";
	} else{
		document.getElementById("editSellDeleteBtns").style.display="none";
	}
	// console.log("showNext",showNext)
	if (showNext){
		document.getElementById("page3NextButton").style.display="";
	}else{
		document.getElementById("page3NextButton").style.display="none";
	}

	if (trades.activeTrade.have){
		document.getElementById("sellTradeHave").innerHTML=`&nbsp;` +trades.activeTrade.have+ ` <img src="assets/img/flags/`+trades.activeTrade.have.toLowerCase()+`.png" width="40" height="25" alt="" >`;
		document.getElementById("sellTradeWant").innerHTML=`&nbsp;` +trades.activeTrade.want+ ` <img src="assets/img/flags/`+trades.activeTrade.want.toLowerCase()+`.png" width="40" height="25" alt="" >`;
		document.getElementById("sellAmount").innerHTML=`&nbsp;` +trades.activeTrade.amountHave;
		var location="";
		for (var i in addresses.data){
			
			if (addresses.data[i].addressId==trades.activeTrade.addressId){
				location+="Within " + trades.activeTrade.distanceWillingToTravel + " km of " + addresses.data[i].address1 + " " + addresses.data[i].city + " " +addresses.data[i].state + " "+ addresses.data[i].zip;
				break;
			}
		}
		document.getElementById("sellLocation").innerHTML=`&nbsp;` +location;
	}








}



trades.drawTradePage4=function(data,onSuccess){
	// console.log("draw page4",trades.activeTrade)
	// console.log(app.url.tradeSearchId, trades.activeTrade.buyTradeSearchId)
	// console.log(app.url.tradeSearchId, trades.activeTrade.matches)

	// for (var i=0;i<trades.activeTrade.matches.length;i++){
	// 	console.log(i)
	// }

}


trades.chooseAddress=function (num){
	console.log("trades.chooseAddress", num);	
	trades.addressNumber=num;

	document.getElementById("currency-addressId").value=addresses.data[trades.addressNumber].addressId;
	document.getElementById("currency-lat").value=addresses.data[trades.addressNumber].lat;
	document.getElementById("currency-lng").value=addresses.data[trades.addressNumber].lng;

	
	maps.moveToLocation(addresses.data[trades.addressNumber].lat, addresses.data[trades.addressNumber].lng);
	
}


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
	
	trades.getTradeSearches(user.data.session);
	// trades.getTradeMatches(user.data.session);
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
trades.buyerPayment=function(sessionId, tradeMatchId, paypalOrderId, onSuccess,onTimeout){
	console.log("buyerpayment",sessionId,tradeMatchId)
	var data={};
	data.sessionId=user.sessionId;
	data.tradeMatchId=tradeMatchId;
	data.paypalOrderId=paypalOrderId;
	
	var command={"object":"trades","method":"buyerPayment","data":data};
	connection.send(JSON.stringify(command));
}
trades.buyerPaid=function(data, onSuccess,onTimeout){
	trades.getTradeMatches(user.data.session);
	paymentModal.hide();
}

trades.sellerPayment=function(sessionId, tradeMatchId, paypalOrderId, onSuccess,onTimeout){
	console.log("sellerpayment",sessionId,tradeMatchId)
	var data={};
	data.sessionId=user.sessionId;
	data.tradeMatchId=tradeMatchId;
	data.paypalOrderId=paypalOrderId;
	
	var command={"object":"trades","method":"sellerPayment","data":data};
	connection.send(JSON.stringify(command));
}
trades.sellerPaid=function(data, onSuccess,onTimeout){
	trades.getTradeMatches(user.data.session);
	paymentModal.hide();
}
trades.validateFormElement=function (element){
	if(!element.checkValidity()){
		element.classList.add('is-invalid');
		return 'is-invalid'
	} else{
		element.classList.remove('is-invalid');
		element.classList.add('invalid');
		return 'valid'
	}
}

trades.formValid=function (formId, onSuccess){
	trades.form=document.getElementById(formId);
	if (!trades.form.checkValidity()) {
		trades.form.classList.add('is-invalid');
		return false;
	} else{
		trades.form.classList.add('was-validated');
		if (onSuccess){
			onSuccess();
		}
		return true;
	}
}

var currencyHave;
var currencyWant;
var amount;
trades.convertValue=function (){
	currencyHave=document.getElementById("currency-currencyHave").value.toLowerCase();
	currencyWant=document.getElementById("currency-currencyWant").value.toLowerCase();
	amount=document.getElementById("currency-amountHave").value.replace(/[^0-9]/g, '');
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
	
	document.getElementById("currency-currencyWant").style.display;
	document.getElementById("currency-wantType").innerHTML=currencyWant;
	document.getElementById("currency-haveType").innerHTML=currencyHave;
	document.getElementById("currency-convertedValue").innerHTML=amountInWant;
		
}

trades.saveActiveTrade=function(page,nextPage){
	console.log("trades.saveActiveTrade",page);

	var isVerified=false;
	if (page =='tradePage1'){
		pages.go(nextPage,'tradeSearchId='+trades.activeTrade.tradeSearchId,false);
	}
	else if (page =='tradePage2'){
		if (trades.activeTrade.type=="buy"){
			document.getElementById("currency-amountHave").value=0;
		}
		trades.validateFormElement(document.getElementById("currency-currencyHave"));
		trades.validateFormElement(document.getElementById("currency-currencyWant"));
		
		console.log("check amount")
		trades.validateFormElement(document.getElementById("currency-amountHave"));
		
		trades.validateFormElement(document.getElementById("currency-addressId"));
		trades.validateFormElement(document.getElementById("currency-distance"));
		isVerified=trades.formValid("currencyForm1");
		console.log(trades);
		if (isVerified){
			console.log("acb");
			trades.activeTrade.have=document.getElementById("currency-currencyHave").value;
			trades.activeTrade.want=document.getElementById("currency-currencyWant").value;
			trades.activeTrade.amountHave=document.getElementById("currency-amountHave").value.replace(/[^0-9]/g, '');
			trades.activeTrade.addressId=document.getElementById("currency-addressId").value;
			trades.activeTrade.distance=document.getElementById("currency-distance").value;
			trades.activeTrade.lat=document.getElementById("currency-lat").value;
			trades.activeTrade.lng=document.getElementById("currency-lng").value;
			
			if (trades.activeTrade.have){
				trades.activeTrade.have=trades.activeTrade.have.toLowerCase();
			}

			console.log("add");
			if (trades.activeTrade.want){
				trades.activeTrade.want=trades.activeTrade.want.toLowerCase();
			}

			var data=trades.activeTrade
			data.nextPage=nextPage;
			trades.saveActiveTradeToServer(data);
			
		console.log("abdddc");
			//pages.go(nextPage,'tradeSearchId='+trades.activeTrade.tradeSearchId,false);
		}
	}
	else if (page =='tradePage3'){
		trades.validateFormElement(document.getElementById("currency-addressId"));
		trades.validateFormElement(document.getElementById("currency-distance"));
		isVerified=trades.formValid("currencySellForm3");
		if (isVerified){
			trades.activeTrade.addressId=document.getElementById("currency-addressId").value;
			trades.activeTrade.distance=document.getElementById("currency-distance").value;
			trades.activeTrade.lat=document.getElementById("currency-lat").value;
			trades.activeTrade.lng=document.getElementById("currency-lng").value;
			// console.log(trades.activeTrade)
			// pages.go('tradePage4');
		}
	}
	else if (page =='tradePage4'){
		

	}
	
	

	

}

trades.saveActiveTradeToServer=function(data,onSuccess){
	console.log("saveActiveTradeToServer",data)
	var nextPage=data.nextPage;
	var tradeSearchId=data.tradeSearchId;
	trades.activeTrade.returnObject='trades';
	var command={"object":"trades","method":"saveTradeSearch","data":data};
	connection.send(JSON.stringify(command), function(saveTradeSearchResults){
		console.log("insert new tradesearch",saveTradeSearchResults);
		
		
		// trades.getTradeMatches(user.data.session);
		var data={}
		data.sessionId=objects.user.sessionId;
		trades.getTradeSearches(data
			,function(results){
				console.log("UPDATED TRADESERCH",results);
				
				
				console.log("results.data",results.data)
				console.log("activeTrade",trades.activeTrade)

				pages.go(nextPage,"tradeSearchId="+saveTradeSearchResults.data.tradeSearchId);
			}
		);
		
	});
}
trades.tradeSearchSaved=function(data,onSuccess){
	console.log("trades.tradeSearchSaved",data);


	// Turn this into a URL variable!



}

trades.deleteTradeSearch=function(data, onSuccess,onTimeout){
	console.log("trades.deleteTradeSearch",data);
	
	var data={};
	data.tradeSearchId=trades.activeTrade.tradeSearchId;
	var command={"object":"trades","method":"deleteTradeSearch","data":data};
	console.log(command);
	connection.send(JSON.stringify(command));
}

trades.tradeSearchDeleted=function(data,onSuccess,onFailure){
	console.log("trades.tradeSearchDeleted");
	trades.getTradeSearches(user.data.session);
	// trades.getTradeMatches(user.data.session);
	pages.go('dashboardPage');

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

trades.suggestTradeMatchDate=function(data,onSuccess){
	var data={};
	
	data.sessionId=user.sessionId;
	data.tradeMatchId=trades.activeTrade.match.tradeMatchId;
	data.dateTimeSuggest=new Date(document.getElementById("dateSuggest").value + " " + document.getElementById("timeSuggest").value);

	
	var command={"object":"trades","method":"suggestTradeMatchDate","data":data};
	console.log(command);	
	connection.send(JSON.stringify(command));
}
trades.tradeMatchDateSuggest=function(data, onSuccess){
	console.log('trades - tradeMatchDateSuggest..');
	console.log(data);
	trades.activeTrade.match.dateTimeSuggest=data.dateTimeSuggest;
	trades.drawSuggestedDate();
}
trades.drawSuggestedDate=function(data,onSuccess){
	if (trades.activeTrade.match && trades.activeTrade.match.dateTimeSuggest && trades.activeTrade.match.dateTimeSuggest.length>0){
		var dateSuggestion=moment(trades.activeTrade.match.suggestTradeMatchDate).fromNow();;
		document.getElementById("suggestedDate").innerHTML=dateSuggestion
		
		document.getElementById("suggestDateForm").style.display="none"
		document.getElementById("suggestedDateDiv").style.display="";
	} else{
		
		document.getElementById("suggestDateForm").style.display=""
		document.getElementById("suggestedDateDiv").style.display="none";
	}


}