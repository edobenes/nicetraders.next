var wizard={};

wizard.init=function(wizardDiv, step){
	console.log("wizard init")
	wizard.step=step;

	wizard.wizardDiv = document.getElementById(wizardDiv);
	wizard.tabPillEl = document.querySelectorAll('#pill-tab2 [data-bs-toggle="pill"]');
	wizard.tabProgressBar = document.querySelector('.theme-wizard .progress');
	wizard.tabToggleButtonEl = wizard.wizardDiv.querySelectorAll('[data-wizard-step]');
	wizard.form = wizard.wizardDiv.querySelector('[novalidate]');
	wizard.nextButton = wizard.wizardDiv.querySelector('.next button');
	wizard.prevButton = wizard.wizardDiv.querySelector('.previous button');
	wizard.cardFooter = wizard.wizardDiv.querySelector('.theme-wizard .card-footer');
	wizard.prevButton.classList.add('d-none'); // on button click tab change
	
	wizard.progress();

}


wizard.nextTab= function() {
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