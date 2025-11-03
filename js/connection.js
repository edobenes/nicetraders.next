

var connection={};
connection.isLoaded=true;

connection.restPath="";
// connection.sessionId=Cookies.get('sessionId');
connection.send=function(commandJSON, onResults){
	if (!connection.restPath){
		console.log("connection.restPath not defined");
		return;
	}

	var commandObj=JSON.parse(commandJSON);
	// console.log("commandObj",commandObj);
	if (user && user.sessionId){
		if (!commandObj.data.sessionId){
			commandObj.data.sessionId=user.sessionId;
			commandJSON=JSON.stringify(commandObj);
		}
	}

	
	try{
		var xmlhttp = new XMLHttpRequest();

		xmlhttp.timeout = 60000; 

		xmlhttp.onerror=function(e){
			pages.go('error');
		}
		xmlhttp.ontimeout = function (e) {
			console.log("timeout!",e);
			pages.go('error');
		};

			xmlhttp.onreadystatechange = function(){
			if (this.readyState==4 && this.status ==200){
				try{
					var command=JSON.parse(this.responseText);
				} catch(err){
					console.log("JSON error",err);
					return;
				}
				console.log("command from server",command);
				if (app.onMessage){
					app.onMessage(command);
				}
				if (onResults){
					onResults(command);
				}
				//onSuccess(this.responseText);
			}
		};
		var url=this.restPath+"?command="+commandJSON;
		//console.log("command TO server", commandObj);
		xmlhttp.open("GET",url,true);
		xmlhttp.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');


		xmlhttp.send();
	}
		catch(e){
			console.log('failing')
			pages.go('error');
		
		}
	//xmlhttp.send(commandJSON); // for POST
}

connection.get=function(queryString, onResults){
	

	
	try{
		var xmlhttp = new XMLHttpRequest();

		xmlhttp.timeout = 60000; 

		xmlhttp.onerror=function(e){
			console.error('error',e);
		}
		xmlhttp.ontimeout = function (e) {
			console.error("timeout!",e);
			//pages.go('error');
		};

			xmlhttp.onreadystatechange = function(){
			if (this.readyState==4 && this.status ==200){
				try{
					var command=JSON.parse(this.responseText);
				} catch(err){
					console.log("JSON error",err);
					return;
				}
				console.log("command from server",command);
				if (app.onMessage){
					app.onMessage(command);
				}
				if (onResults){
					onResults(command);
				}
				//onSuccess(this.responseText);
			}
		};
		var url=this.restPath+"?"+queryString;
		console.log("url", url);
		xmlhttp.open("GET",url,true);
		xmlhttp.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');


		xmlhttp.send();
	}
		catch(e){
			console.log('failing')
			pages.go('error');
		
		}
	//xmlhttp.send(commandJSON); // for POST
}