if (!messagesDebug){
	var messagesDebug=true;
}
var messages={};
messages.data=[];
messages.isLoaded=false;

messages.checkMessages=function(data,onSuccess){
	messages.timer=setInterval(() => {
		messages.getMessages();
	}, 60000);
}

messages.sendMessage=function (){
	
	var data={};
	data.message=document.getElementById("message").value;
	data.sessionId=user.sessionId;
	data.tradeMatchId=trades.activeTrade.matches[0].tradeMatchId;
	document.getElementById("message").value="";
	if (messages.data.length){
		data.dateLastMessage=messages.data[messages.data.length-1].dateAdded;
	} else{
		data.dateLastMessage="";
	}


	var command={"object":"messages","method":"insertMessage","data":data};
	console.log(command)
	connection.send(JSON.stringify(command));
	


	

	//var command={"action":"insertMessage","sessionId":user.sessionId,"tradeMatchId":tradeMatchId,"message":message,"dateLastMessage":dateLastMessage};
	//connection.send(JSON.stringify(command));





	//messages.insertMessage(user.sessionId,tradeMatchId,message,function(responseJSON){
			
	//		//messages.data=JSON.parse(responseJSON);
	//		document.getElementById("messages").innerHTML="";
	//		drawMessages(messages.data);
	//		document.getElementById("message").value="";
	//	},function(err){
	//		console.log(err);
	//	}
	//);
	
}
messages.newMessage=function(data,onSuccess){
	//console.log("newMessage",data)
	messages.data.push(data);
	
	messages.drawMessages();
}
messages.allMessages=function(data,onSuccess){
	console.log("allMessages",data)
	messages.data=messages.data.concat(data);;
	messages.isLoaded=true;
	messages.drawMessages();
}

messages.getMessages=function (data,onSuccess){
	//console.log("getMessages",data);
	var data={};
	data.sessionId=user.sessionId;
	if (messages.data.length){
		data.dateLastMessage=messages.data[messages.data.length-1].dateAdded;
	} else{
		data.dateLastMessage="";
	}


	var command={"object":"messages","method":"getMessages","data":data};
	console.log(command)
	connection.send(JSON.stringify(command));
	//messages.getMessages(user.sessionId,tradeMatchId, function(responseJSON){
	//		//messages.data=JSON.parse(responseJSON);
	//		drawMessages(messages.data);
	//	},function(err){
	//		console.log(err);
	//	}
	//)
}


messages.drawMessages=function (data,onSuccess){
	console.log("draw",messages.data);
	var html="";
	var dateAdded;
	for (var i in messages.data){				
		var dateAdded=moment(messages.data[i].dateAdded);
		dateAdded.local();
		html+=dateAdded.calendar()+ " " + messages.data[i].firstName+ " " + messages.data[i].message +"<BR>";	
	}
	document.getElementById("messages").innerHTML=html;
}