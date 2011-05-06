/*
    Copyright (c) 2011 Facundo Cabrera, <cabrerafacundo at gmail dot com>

    This file is part of Tuor.

    Tuor is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Tuor is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with Tuor.  If not, see <http://www.gnu.org/licenses/>.
*/
(function($, doc, win) {
    var $doc = $(doc),
        $win = $(win),

        /**
         * Strategy for iterate the steps of a given Tour.
         */
        sequencer = function () {
	    var index = -1,
		seq = null;
	    
	    return {
		init: function (sequence) {
		    seq = sequence;
		    index = 0;
		},
		next: function() {
		    index = (index + 1) % seq.length;
		}, 
		back: function() {
		    index -= 1;
                    if(index < 0) index = seq.length -1;
		},
		go: function (step) {
		    (step >= 0 && step < seq.length) ? index = step : index = 0;
		},
		get: function () {
		    return seq[index];
		}
	    }
	}(),

        /**
         * Abstraction of the visible area of the Page.
         */
        viewport = function ($win) {
            return {
                // scroll the window
                move : function (to) {
                    $win.scrollTop(to);
                },
                // gets the scroll position given the elements that's need to be visible.
                visible : function ($el, $tooltip) {
                    var view_top, 
                        view_bottom,
                        el_top,
                        el_bottom,
                        tooltip_top,
                        tooltip_bottom,
                        visible_top,
                        visible_bottom;

                    view_top = $win.scrollTop();
                    view_bottom = $win.scrollTop() + $win.height();
                    
                    // position relative to the document
                    el_top = $el[0];
                    el_bottom = el_top + $el[2];

                    // position relative to the document
                    tooltip_top =  parseFloat($tooltip[0], 10);
                    tooltip_bottom = tooltip_top + parseFloat($tooltip[2], 10);

                    visible_top = Math.min(el_top, tooltip_top); // the min top value between element.top and tooltip.top 
                    visible_bottom = Math.max(el_bottom, tooltip_bottom); // the max value between (element.top + element.height) and (tooltip.top + tooltip.height)

                    return ((visible_top < view_top || visible_top > view_bottom) || (visible_bottom < view_top || visible_bottom > view_bottom)) ? visible_top : null;
                },
                // makes the given tooltip always visible
                makeVisible : function (tooltip) {
                    var ref = tooltip.getRefCorners(),
                        tip = tooltip.getTooltipCorners(),
                        scrollTop = 0;

                    scrollTop = this.visible(ref, tip);

                    if(scrollTop !== null)
                        this.move(scrollTop);
                }
            };
        } ($win),

        /**
         * Abstract the overlay layer.
         */
        overlay = function () {
            var overlay = null;

            if (overlay === null) {
                overlay = $('<div>').addClass('overlay').hide();


                $(doc).ready(function() {
                    $('body').prepend(overlay);
                });
            }

            return {
                show : function () {
                    overlay.show();
                },
                hide : function () {
                    overlay.hide();
                }
            };
        }(),

        /**
         * Tooltip abstraction.
         */
        tooltip = function () {
            var position = {
                    // return [el.top, el.left, el.height, el.width];
                    corners : function (el) {
                        return [
                            el.offset().top, 
                            el.offset().left, 
                            el.outerHeight(true), 
                            el.outerWidth(true)
                        ];
                    },
                    /**
                        TL  top left
                        TR  top right
                        BL  bottom left
                        BR  bottom right
                        LT  left top
                        LB  left bottom
                        RT  right top
                        RB  right bottom
                        T   top
                        R   right
                        B   bottom
                        L   left
                    */ 
                    calculate : function (el, place, tooltip) {
                        var c = this.corners(el), 
                            t = this.corners(tooltip);

		        switch(place) {
			    case 'TL' : return { 'left' : c[1] + 'px', 'top' : c[0] + c[2] + 'px' };
			    case 'TR' : return { 'left' : c[1] + c[3] - t[3] + 'px', 'top' : c[0] + c[2] + 'px' };
			    case 'BL' : return { 'left'	: c[1] + 'px', 'top' : c[0] - t[2] + 'px' };
			    case 'BR' : return { 'left' : c[1] + c[3] - t[3] + 'px', 'top' : c[0] - t[2] + 'px' };
			    
                            case 'LT' : return { 'left' : c[1] + c[3] + 'px', 'top' : c[0] + 'px' };
			    case 'LB' : return { 'left'	: c[1] + c[3] + 'px', 'top' : c[0] + c[2] - t[2] + 'px' };
			    case 'RT' : return { 'left' : c[1] - t[3] + 'px', 'top' : c[0] + 'px' };
			    case 'RB' : return { 'left' : c[1] - t[3] + 'px', 'top' : c[0] + c[2] - t[2] + 'px' };
			    
                            case 'T'  : return { 'left'	: c[1] + c[3]/2 - t[3]/2 + 'px', 'top' : c[0] + c[2] + 'px' };
			    case 'R'  : return { 'left'	: c[1] - t[3] + 'px', 'top' : c[0] + c[2]/2 - t[2]/2 + 'px' };
			    case 'B'  : return { 'left' : c[1] + c[3]/2 - t[3]/2 + 'px', 'top' : c[0] - t[2] + 'px' };
			    case 'L'  : return { 'left' : c[1] + c[3]  + 'px', 'top' : c[0] + c[2]/2 - t[2]/2 + 'px' };
        
                            default: throw { message: 'unsupported place argument' };
		        }
                    }
                };

            return function (el) {
                return {
                    getRefCorners : function () {
                        return position.corners(el.el);
                    },
                    getTooltipCorners : function () {
                        var prop = position.calculate(el.el, el.place, el.tooltip),
                            corn = position.corners(el.tooltip);
                        
                        // TODO
                        // remove the px string from these values before return. 
                        corn[0] = prop.top;
                        corn[1] = prop.left;
                
                        return corn;
                    },
                    show : function() {
                        var prop = position.calculate(el.el, el.place, el.tooltip);
                        
                        el.tooltip.find('span.arrow').addClass('arrow_' + el.place);
                        el.tooltip.addClass('tooltip').css(prop).addClass('visible');
                       
                        return this;
                    },
                    hide : function() {
                        el.tooltip.removeClass('visible');
                        return this;
                    },
                    toogle : function () {
                        return el.tooltip.hasClass('visible') ? this.hide() : this.show();
                    }
                };
            };
        }(),

        /**
         * Autoplay API.
         */
        autoplay = function (tuor) {
            var timerId = null,
                api = null;
            
            api = {
                // TODO
                // the callback delay must be an parameters and not a fixed value
                start : function () {
                    $('body').live('keyup', api.stop);
                    
                    tuor.start();
                    
                    timerId = setInterval(function() {
                        tuor.next();
                    }, 3000);
                }, 
                stop : function () {
                    // WARNING
                    // jQuery bind this with the element that is receiving the
                    // event keyup
                    $('body').die('keyup', api.stop);
                    clearInterval(timerId);
                }
            };

            return api;
        },

        /**
         * Tour API.
         */
        tuor = {
            init : function (steps) {
                sequencer.init(steps);
            },
            events : {
                keyup: function (ev) {
                    console.log("keyup");
                    switch (ev.which) {
                        case 27: // esc key
                            tuor.stop();
                            break;
                        case 37: // left arrow
                            tuor.prev();
                            break;
                        case 39: // right arrow
                            tuor.next();
                            break;
                    }
                } 
            },
            start: function () { 
                var tt = tooltip(sequencer.get()); // get active element

                overlay.show(); // show the overlay
                
                viewport.makeVisible( tt ); // move the viewport if needed

                tt.show(); // show the active element
                
                // $('body').live('keyup', tuor.events.keyup); // bind key events
            },
            next : function () {
                var active = tooltip(sequencer.get()); // get active element
 
                active.toogle(); // hide active
                sequencer.next(); // next 
                
                active = tooltip(sequencer.get()); // get active element
                viewport.makeVisible( active ); // move the viewport if neccesary
                active.toogle(); // show element
            },
            prev : function () {
                var active = tooltip(sequencer.get()); // get active element
 
                active.toogle(); // hide active
                sequencer.back(); // back
                
                active = tooltip(sequencer.get()); // get active element
                viewport.makeVisible( active ); // move the viewport if neccesary
                active.toogle(); // show element
            },
            go : function (n) {
                var active = tooltip(sequencer.get()); // get active element
 
                active.hide(); // hide active
                sequencer.go(n); // jump
                
                active = tooltip(sequencer.get()); // get active element
                viewport.makeVisible( active ); // move the viewport if neccesary
                active.show(); // show element
            },
            stop : function () {
                tooltip(sequencer.get()).hide(); // hide active element

                // TODO call destroy instead hide
                overlay.hide(); // remove the overlay
            },
            destroy : function () {
                $doc.unbind('.tuor');
            }
        },

        /**
         * Plugin default settings.
         */
        settings = {
	    autoplay : false, // starts automatically
            controls : false, // append this control element to each tooltip
	    steps: []         // tooltips which compose the web tour
        };

    $.tuor = function(options) {
        var bot = null;

	$.extend(settings, options);

	tuor.init(settings.steps);

        $doc.bind('start.tuor', function (ev) {
            console.log('start.tuor');
            tuor.start();
        });

        $doc.bind('stop.tuor', function (ev) {
            tuor.stop();
        });

        $doc.bind('go.tuor', function (ev, n) {
            tuor.go(n);
        });

        $doc.bind('run.autoplay.tuor', function (ev) {
            // console.log('start.autoplay.tuor');
            // TODO
            // This must be singleton
            bot = autoplay(tuor);
            bot.start();
        });

        $doc.bind('stop.autoplay.tuor', function (ev) {
            // TODO
            // This must be singleton
            if(bot !== null) {
                bot.stop();
                bot = null;
            }
        });

        $doc.bind('next.tuor', function (ev) {
            tuor.next();
        });
        $doc.bind('prev.tuor', function (ev) {
            tuor.prev();
        });

        $doc.bind('keyup.tuor', tuor.events.keyup);

        $doc.bind('destroy.tuor', function (ev) { 
            tuor.destroy();

            if(bot !== null) 
                bot.stop();
            
            tuor.stop();
        });
    };

})(jQuery, document, window);
