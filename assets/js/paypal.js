function initPayPalButton() {
	paypal.Buttons(
		{
			locale: 'en_US',
			style: {
				shape: 'pill',
				color: 'gold',
				layout: 'vertical',
				label: 'pay',
				size: 'medium'
			},

			createOrder: function(data, actions) {
				return actions.order.create({
					purchase_units: [{"amount":{"currency_code":"USD","value":1}}]
				});
			},

			onApprove: function(data, actions) {
				console.log(user.sessionId);
				console.log(tradeMatchId)
				console.log(data.orderId);
				
				//console.log("data",data.orderId);
				//console.log("actions",actions);
				return actions.order.capture().then(function(details) {
					console.log("paypal details",details);
					var data={};
					data.sessionId=user.sessionId;
					data.tradeMatchId=tradeMatchId;
					var method;
					if (iam=='buyer'){
						method='buyerPayment';
						data.buyerOrderId=details.id;
					} else{
						method='sellerPayment';
						data.sellerOrderId=details.id;

					}
					var command={"object":"trades","method":method,"data":data};
					console.log(command);
					connection.send(JSON.stringify(command));
					//trade.buyerPayment(user.sessionId,tradeMatchId, details.id,function(){
					//	getBuyTradeMatches();
					//	paymentModal.hide();
					//},function(){
					//	errorMessage("An timeout error occurred with the server, try again.");
					//	paymentModal.hide();

					//})
					//alert('Transaction completed by ' + details.payer.name.given_name + '!');
				});
			},

			onError: function(err) {
				console.log("paypal error",err);
			}
		}
	).render('#paypal-button-container');
}


