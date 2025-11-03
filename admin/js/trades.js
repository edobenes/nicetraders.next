
var trades={};


trades.activeTrade;
trades.getTrades=function(data,onSuccess,onFailure){
	
	var data={}
	data.sessionId=admin.sessionId;
	var command={"object":"admin","method":"adminGetTrades","data":data};
	//console.log(command);
	connection.send(JSON.stringify(command));
}
trades.tradeData=function(data,onSuccess,onFailure){
	//console.log("tradeData",data);
	trades.data=data;
	trades.drawTrades();
}
trades.drawTrades=function(){
	//console.log('draw')
		
	var html="";
	for (var i in trades.data){
		html+="<tr  onclick='trades.activeTrade=trades.data["+i+"];trades.drawEditTrade();pages.go(`editTrade`);'>";
		html+="<td nowrap><a>" + trades.data[i].firstName+" " + trades.data[i].lastName+ "</a></td>";
		html+="<td nowrap>" + trades.data[i].want+"</td>";
		html+="<td nowrap>" + trades.data[i].have+"</td>";
		html+="</tr>";
	}
	document.getElementById("trades").innerHTML=html;

	
}