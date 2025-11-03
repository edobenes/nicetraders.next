
const fs = require("fs");
const { Logger } = require("log4js");
const fetch = require('node-fetch');

var currency={};


currency.updateUSD=function(data,onSuccess){
	var d=new Date();
	console.log('running a task twice a day ' + d);
	let url = "https://www.floatrates.com/daily/usd.json";
	try{
		fetch(url)
			.then(res => res.json())
			.then(json => {
				// 
				fs.writeFile('../public_html/assets/js/USD.js', "var exchangeRates="+ JSON.stringify(json), err => {
					if (err) {
						if (onSuccess){
							onSuccess(err);
						}
					}
					console.log('write success');
					//file written successfully
					if (onSuccess){
						onSuccess('write success');
					}
				})
				
				var sql="";
				for (var i in json){
					//  ʻ'
					var name=json[i].name;
					name=name.replace("'", "`");
					name=name.replace("ʻ", "`");
				
					sql += "\ndelete from currencyRates where code='" +json[i].code.substring(0, 5)+"';";
					sql +="insert into currencyRates (code, alphaCode, numericCode, name, rate, date, inverseRate) values( '"+json[i].code.substring(0, 5)+"','"+json[i].alphaCode.substring(0, 5)+"', '"+json[i].numericCode+"','"+name.substring(0, 100)+"',"+json[i].rate+",'"+new Date(json[i].date).toISOString().slice(0, 19).replace('T', ' ')+"',"+json[i].inverseRate+");";
					
				}
				let query = conn.query(sql,(err, results) =>{
					if(err) {
						console.log(err);
						//res.send(err);
						
					} else{
						//res.send(results);
						console.log("downloaded new rates");

						sql="update tradeSearch  set amountHaveInUSD=amountHave*(SELECT inverseRate FROM `currencyRates` WHERE code=tradeSearch.have) where have<>'USD' and have is not null; update TradeSearch set amountHaveInUSD=amountHave where have='USD';";
						let query = conn.query(sql,(err, results) =>{
							if(err) {
								console.log(err);
								//res.send(err);
							} else{
								//res.send(results);
								//console.log("updated TradeSearch");

							}
						});
						

					}
				});

			}
		);
	}
		catch(e){
			console.error("FETCH ERROR!!")
			console.error(e);
		}
}
module.exports =currency;