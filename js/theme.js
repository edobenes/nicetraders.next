/*

Theme: Square - Premium Bootstrap Theme
Product Page: https://themes.getbootstrap.com/product/square
Author: Webinning
Author URI: https://webinning.co.uk

---

Copyright 2020 Webinning

*/

'use strict';


// Preloader
var Preloader = new Promise(function(resolve) {
    // Variables
    var preloader = document.querySelector('.preloader');
    function init() {
        setTimeout(function(){
            preloader.classList.add('fadeOut');
    console.log(preloader)
            setTimeout(function(){
                preloader.style.display = 'none';
            }, 500);
            
            resolve();
        }, 1500); // minimum loading time in second
    }

    // Events
    if (isExist(preloader)) {
        document.onreadystatechange = function () {
            if (document.readyState === 'complete') {
                console.log("eh?")
                init();
            }
        }
    }
});


// Navbar dropdown on hover
var NavbarHover = (function() {
    // Variables
    var navbar = document.querySelectorAll('.navbar-nav .dropdown');

    // Methods
    function init() {
        [].forEach.call(navbar, function(el, i){
            addListenerMulti(el, 'mouseenter mouseleave click', function(e){
                if(window.innerWidth > 991.98) {
                    var dropdown = el.querySelector('[data-toggle="dropdown"]'),
                        instance = new bootstrap.Dropdown(dropdown);

                    e.type === 'mouseenter' ? (instance.show(), dropdown.setAttribute('aria-expanded', true)) : (instance.hide(), dropdown.blur(), dropdown.setAttribute('aria-expanded', false));
                }
            });
        });
    }

    // Events
    if (navbar.length > 0) {
        init();
    }
}());


// Navbar Toggler
var NavbarToggler = (function() {
    // Variables
    var navbarToggler = document.querySelector('.navbar-toggler');

    // Methods
    function init() {
        navbarState();
        
        navbarToggler.addEventListener('click', function() {
            setTimeout(function(){
                navbarState();
            })
        }, false);
    }

    function navbarState(){
        // Inner variables
        var expanded = navbarToggler.getAttribute('aria-expanded');
        
        if(expanded == 'true') {
            document.documentElement.style.overflow = "hidden";
            document.body.style.paddingRight = getScrollbarWidth() + "px";
        } else {
            document.documentElement.style.overflow = "";
            document.body.style.paddingRight = "";
        }
    }

    // Events
    if (isExist(navbarToggler)) {
        init();
    }
}());


// Navbar togglable
var NavbarTogglable = (function() {
    // Variables
    var navbarTogglable = document.querySelector('.navbar-togglable');


    // Methods
    function init() {
        // Inner variables
        var logo = document.querySelector('.logo'),
            navbarColorOrig = 'navbar-light',
            isNavbarColorDark = false,
            logoColorOrig1 = logo.querySelectorAll('path')[0].getAttribute('fill'),
            logoColorOrig2 = logo.querySelectorAll('path')[1].getAttribute('stroke');

        if(navbarTogglable.classList.contains('navbar-dark')) {
            navbarColorOrig = 'navbar-dark';
            isNavbarColorDark = true;
        }

        window.addEventListener('scroll', function(e) {
            // Inner variables
            var pageYScroll = window.pageYOffset || document.documentElement.scrollTop;

            if(pageYScroll > 10) {
                navbarTogglable.classList.add('bg-white');

                if(isNavbarColorDark) {
                    navbarTogglable.classList.remove('navbar-dark');
                    navbarTogglable.classList.add('navbar-light');
                }

                logo.querySelectorAll('path')[0].style.fill = getCssVariable('--primary');
                logo.querySelectorAll('path')[1].style.stroke = getCssVariable('--primary');
            } else {
                navbarTogglable.classList.remove('bg-white');

                if(isNavbarColorDark) {
                    navbarTogglable.classList.remove('navbar-light');
                    navbarTogglable.classList.add('navbar-dark');
                }

                logo.querySelectorAll('path')[0].style.fill = logoColorOrig1;
                logo.querySelectorAll('path')[1].style.stroke = logoColorOrig2;
            }
        }, false);
    }


    // Events
    if(isExist(navbarTogglable)) {
        init();
    }
}());

// AOS
var AOSAnimation = (function() {
    // Variables
    var aos = document.querySelectorAll('[data-aos]'),
        preloader = document.querySelector('.preloader');
    

    // Methods
    function init() {
        // Inner variables

        var options = {
            once: true,
            duration: 750
        };

        if(isExist(preloader)) {
            Preloader.then(function() {
                setTimeout(function(){
                    AOS.init(options);
                }, 200);
            }, function(error) {
                // error goes here
            });
        } else {
            AOS.init(options);
        }
    }


    // Events
    if(aos.length > 0) {
        init();
    }
}());


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

// Jarallax
var Jarallax = (function() {
    // Variables
    var jarallax = document.querySelector('[data-jarallax]'),
        jarallaxVideo = document.querySelector('[data-jarallax-video]');


    // Events
    if(isExist(jarallax)) {
        fetchInject([
            '/vendors/jarallax/dist/jarallax.js',
            '/vendors/jarallax/dist/jarallax.css'
        ]);
    }
    if(isExist(jarallaxVideo)) {
        fetchInject([
            '/vendors/jarallax/dist/jarallax-video.min.js'
        ]);
    }
}());




// Helper functions
function isExist(el) {
    if(typeof(el) != 'undefined' && el != null) {
        return true;
    } else {
        return false;
    }
}

function addListenerMulti(el, s, fn) {
    s.split(' ').forEach(function (e) {
        return el.addEventListener(e, fn, false);
    });
}

function mergeObjects(){
    var res = {};
    for(var i = 0; i < arguments.length; i++){
        for(var x in arguments[i]){
            res[x] = arguments[i][x];
        };
    };
    return res;
};

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

function detatch(el) {
    return el.parentElement.removeChild(el);
}

function closest(el, selector) {
    const matchesSelector = el.matches || el.webkitMatchesSelector || el.mozMatchesSelector || el.msMatchesSelector;
  
    while (el) {
        if (matchesSelector.call(el, selector)) {
            return el;
        } else {
            el = el.parentElement;
        }
    }
    return null;
}

function getScrollbarWidth() {
    return window.innerWidth - document.documentElement.clientWidth;
}

function getCookie(name) {
    var v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
    return v ? v[2] : null;
}

function setCookie(name, value, days) {
    var d = new Date;
    d.setTime(d.getTime() + 24*60*60*1000*days);
    document.cookie = name + "=" + value + ";path=/;expires=" + d.toGMTString();
}

function deleteCookie(name) {
    setCookie(name, '', -1);
}

function getCssVariable(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name);
}

function isInViewport(elem) {
    var bounding = elem.getBoundingClientRect();
    return (
        bounding.top >= 0 &&
        bounding.left >= 0 &&
        bounding.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        bounding.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}