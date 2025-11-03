var fetchInject = (function () {
	"use strict";
	var e = function (e, t, n, r, i, o, a) {
		(o = t.createElement(n)), (a = t.getElementsByTagName(n)[0]), o.appendChild(t.createTextNode(r.text)), (o.onload = i(r)), a ? a.parentNode.insertBefore(o, a) : t.head.appendChild(o);
	};
	return function (t, n) {
		if (!arguments.length) return Promise.reject(new ReferenceError("Failed to execute 'fetchInject': 1 argument required but only 0 present."));
		if (arguments[0] && arguments[0].constructor !== Array) return Promise.reject(new TypeError("Failed to execute 'fetchInject': argument 1 must be of type 'Array'."));
		if (arguments[1] && arguments[1].constructor !== Promise) return Promise.reject(new TypeError("Failed to execute 'fetchInject': argument 2 must be of type 'Promise'."));
		var r = [],
			i = n ? [].concat(n) : [],
			o = [];
		return (
			t.forEach(function (e) {
				return i.push(
					window
						.fetch(e)
						.then(function (e) {
							return [e.clone().text(), e.blob()];
						})
						.then(function (e) {
							return Promise.all(e).then(function (e) {
								r.push({ text: e[0], blob: e[1] });
							});
						})
				);
			}),
			Promise.all(i).then(function () {
				return (
					r.forEach(function (t) {
						o.push({
							then: function (n) {
								t.blob.type.includes("text/css") ? e(window, document, "style", t, n) : e(window, document, "script", t, n);
							},
						});
					}),
					Promise.all(o)
				);
			})
		);
	};
})();


// Swiper
var SwiperSlider = (function() {
    // Variables
    var swiper = document.querySelectorAll('.swiper');
    
    
    // Methods
    function init(elem, index) {
        // Inner variables
        var parents = closest(elem, 'section'),
            prevEl = parents.querySelectorAll('.swiper-btn-prev'),
            nextEl = parents.querySelectorAll('.swiper-btn-next'),
            paginationEl = parents.querySelectorAll('.swiper-pagination'),
            dataOptions = JSON.parse(elem.querySelector('.swiper-container:not(.swiper-thumbs)').getAttribute('data-options')),
            hasThumb = Boolean(elem.querySelector('.swiper-thumbs')),
            swiperThumbs;

        if (hasThumb) {
            var dataOptionsThumbs = JSON.parse(elem.querySelector('.swiper-thumbs').getAttribute('data-options'));

            // Swiper default options for thumbnails
            var options = {
                slidesPerView: 4,
                spaceBetween: 10,
                watchSlidesVisibility: true,
                watchSlidesProgress: true
            };
            var mergedOptions = mergeObjects(options, dataOptionsThumbs);
            var swiperThumbs = new Swiper(elem.querySelector('.swiper-thumbs'), mergedOptions);
        }

        // Swiper default options
        var options = {
            navigation: {
                prevEl: prevEl,
                nextEl: nextEl
            },
            pagination: {
                el: paginationEl,
                clickable: true
            },
            keyboard: {
                enabled: true,
            },
            spaceBetween: 32,
            speed: 750,
            watchOverflow: true,
        };
        if (hasThumb) {
            options.thumbs = {
                swiper: swiperThumbs
            }
        }
        var mergedOptions = mergeObjects(options, dataOptions);
        var swiper = new Swiper(elem.querySelector('.swiper-container:not(.swiper-thumbs)'), mergedOptions);
    }


    // Events
    if(swiper.length > 0) {
        fetchInject([
            '/vendors/swiper/css/swiper.min.css',
            '/vendors/swiper/js/swiper.min.js'
        ]).then(() => {
            [].forEach.call(swiper, function(el, i){
                init(el, i);
            });
        });
    }
}());




