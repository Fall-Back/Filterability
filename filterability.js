/*!
    Filterability v0.0.1
    https://github.com/Fall-Back/Filterability
    Copyright (c) 2017, Andy Kirk
    Released under the MIT license https://git.io/vwTVl
*/
(function() {
    var ready = function(fn) {
        if (document.attachEvent ? document.readyState === "complete" : document.readyState !== "loading") {
            fn();
        } else {
            document.addEventListener('DOMContentLoaded', fn);
        }
    }

	var filterability = {

        markjs_error_raised: false,
        filterable_index_names: [],

        init: function() {
            // Look for all `filterable_group`:
            var filterable_groups = document.querySelectorAll('[filterable_group]');

            Array.prototype.forEach.call(filterable_groups, function(filterable_group, i) {
                // Store items:
                filterable_group.items = filterable_group.querySelectorAll('[filterable_item]');

                // Action 'remove' selector:
                var remove_selector = filterable_group.getAttribute('filterable_remove');
                if (remove_selector !== '') {
                    var remove_els = document.querySelectorAll(remove_selector);
                    Array.prototype.forEach.call(remove_els, function(remove_el, i) {
                        remove_el.remove();
                    });
                }

				// Expose the form if necessary:
				var filterable_form_template = filterable_group.querySelector('[filterable_form_template]');
                var form_added = false;
				if (filterable_form_template) {
					filterable_form = filterable_form_template.innerHTML;
                    
                    // Check for a replace selector, and put the form there, otherwise keep it in
                    // place:
                    var replace_selector = filterable_group.getAttribute('filterable_replace');
                    if (replace_selector) {
                        var replace_el = document.querySelector(replace_selector);
                        var form_el = document.createElement('div');
                        form_el.id  = 'filerable_form_' + i;
                        form_el.innerHTML = filterable_form;
                        if (replace_el.parentNode.replaceChild(form_el, replace_el)) {
                            form_added = form_el.id;
                        }
                    } else {
                    	filterable_form_template.insertAdjacentHTML('afterend', filterable_form);
                        form_added = true;
                    }
				}
                
                // If the form hasn't been added, we can't go any further.
                if (!form_added) {
                    return;
                }

                // Generate initial indexes:
                filterability.generateIndex(filterable_group);


                // Add the empty message to each list:
				var filterable_empty_list_template = filterable_group.querySelector('[filterable_empty_list_template]');
				if (filterable_empty_list_template) {
					filterable_empty_list = filterable_empty_list_template.innerHTML;
				} else {
					// Might as well provide a default:
					var filterable_empty_list_message = 'No matches found.';
					var filterable_empty_list_element = document.createElement('p');
					filterable_empty_list_element.textContent = filterable_empty_list_message;
					filterable_empty_list_element.setAttribute('filterable_empty_list_message', '')
					filterable_empty_list_element.setAttribute('hidden', '');
					filterable_empty_list = filterable_empty_list_element.outerHTML;
				}

                var filterable_lists = filterable_group.querySelectorAll('[filterable_list]');
                Array.prototype.forEach.call(filterable_lists, function(filterable_list, i) {
                    filterable_list.insertAdjacentHTML('afterend', filterable_empty_list);
                });
                
                if (typeof form_added  == 'string') {
                    var filterable_form = document.querySelector('#' + form_added);
                } else {
                    var filterable_form = filterable_group;
                }
                
                if (!filterable_form) {
                    console.error('Could not find form.');
                    return;
                }

                // Get the input:
                var filterable_input = filterable_form.querySelector('[filterable_input]');
                
                // Check for presence of a submit button:
                var filterable_submit = filterable_form.querySelector('[filterable_submit]');

                // If there is one, we want to attach the hander, otherwise, filter on keyup:
                if (filterable_submit) {
                    filterable_submit.addEventListener('click', function(e) {
                        e.preventDefault();
                        filterability.filterList(filterable_group, filterable_input.value);
                        return false;
                    });
                } else {
                    
                    // Attach search input handler:
                    // @TODO: Could allow for different input actions to trigger this.
                    // E.g. user may want to choose from a list of predefined options by which to filter
                    // the list(s) so a select or checkbox change should work as well.
                    
                    filterable_input.addEventListener('keyup', function() {
                        filterability.filterList(filterable_group, this.value);
                    });
                }


                // Toggler stuff:
                var filterable_toggles = filterable_group.querySelectorAll('[filterable_toggle]');

                if (filterable_toggles.length > 0) {
                    var els = filterable_group.querySelector('[filterable_item]').querySelectorAll('[filterable_index_name]');
                    filterability.filterable_index_names = Array.prototype.map.call(els, function(obj) {
                        return obj.getAttribute('filterable_index_name');
                    });

                    Array.prototype.forEach.call(filterable_toggles, function(filterable_toggle, i) {
                        var el_tagName = filterable_toggle.tagName.toLowerCase();
                        var el_type = filterable_toggle.type;
                        if (el_type) {
                            el_type = el_type.toLowerCase();
                        }
                        // Check element is of valid / supported type:
                        if (el_tagName == 'select' || (el_tagName == 'input' && ['checkbox', 'radio'].indexOf(el_type) > -1)) {
                            // Check if the value matches the ones available in the data (or empty string for ALL):
                            if (
                                filterability.filterable_index_names.indexOf(filterable_toggle.getAttribute('filterable_toggle')) > -1
                             || filterable_toggle.getAttribute('filterable_toggle') == ''
                            ) {
                                filterable_toggle.addEventListener('change', function(){
                                    filterability.toggle_index(filterable_group, this.getAttribute('filterable_toggle'));
                                    filterability.generateIndex(filterable_group);
                                    filterability.filterList(filterable_group, filterable_input.value);
                                });
                            }
                        }
                    });

                }


                // Exclusion stuff:
                var excludable_toggles = filterable_group.querySelectorAll('[filterable_exclude_container][filterable_exclude_match]');

                if (excludable_toggles.length > 0) {
                    Array.prototype.forEach.call(excludable_toggles, function(excludable_toggle, i) {
                        var el_tagName = excludable_toggle.tagName.toLowerCase();
                        var el_type = excludable_toggle.type;
                        if (el_type) {
                            el_type = el_type.toLowerCase();
                        }
                        // Check element is of valid / supported type:
                        if (el_tagName == 'input' && ['checkbox'].indexOf(el_type) > -1) {
                            excludable_toggle.addEventListener('change', function(){

                                // Find the element the toggle corresponds to:
                                var ex_els = filterable_group.querySelectorAll(this.getAttribute('filterable_exclude_container'));
                                var is_checked = this.checked;
                                var ex_match = this.getAttribute('filterable_exclude_match');
                                Array.prototype.forEach.call(ex_els, function(ex_el, i) {

                                    var re = new RegExp(ex_match);
                                    var match = re.exec(ex_el.innerHTML);
                                    if (match !== null) {
                                        var parent_filterable_item = filterability.closest(ex_el, '[filterable_item]', '[filterable_list]');
                                        if (is_checked) {
                                            parent_filterable_item.removeAttribute('hidden');
                                        } else {
                                            parent_filterable_item.setAttribute('hidden', '');
                                        }
                                    }
                                });

                                filterability.checkListEmpty(filterable_group);
                            });

                        }
                    });
                }
            });

        },

        generateIndex: function(group) {
            var items = group.items;
            Array.prototype.forEach.call(items, function(item, i){
                if (item.getAttribute('filterable_index') === '') {
                    var index_string = item.textContent;
                } else {
                    var indexes = item.querySelectorAll('[filterable_index]');

                    // @TODO: there's probably a more concise way of doing this. Need to ++ my JS. :-(
                    var index_string = '';

                    Array.prototype.forEach.call(indexes, function(index, i) {
                        index_string += index.textContent + ' ';
                    });
                }

                item.setAttribute('filterable_index_string', index_string.toLowerCase().trim());
            });
        },

        filterList: function(group, query) {

            query = query.toLowerCase().trim();
            var items = group.items;
            Array.prototype.forEach.call(items, function(item, i){
                if (item.getAttribute('filterable_index_string').indexOf(query) > -1) {
                    item.removeAttribute('hidden');

                    // Check we want to highlight results:
                    if (group.getAttribute('filterable_mark_results') === '') {
                        filterability.debounce(filterability.highlight_results(item, query), 250);
                    }

                } else {
                    item.setAttribute('hidden', '');
                }
            });


            filterability.checkListEmpty(group);
        },

        checkListEmpty: function(group) {
            // After filtering, if a list is empty, show the 'empty' message:
            var lists = group.querySelectorAll('[filterable_list]');
            Array.prototype.forEach.call(lists, function(list, i) {
                var list_is_empty = !list.querySelectorAll('[filterable_item]:not([hidden])').length;
                var empty_message = list.nextElementSibling;
				// @TODO: should probably check the we've really selected a `filterable_empty_list_message`

                if (list_is_empty) {
                    list.setAttribute('hidden', '');
                    empty_message.removeAttribute('hidden');
                } else {
                    list.removeAttribute('hidden');
                    empty_message.setAttribute('hidden', '');
                }
            });
        },

        // Allow user-selected indexes:
        toggle_index: function(group, index_name) {
            var items = group.querySelectorAll('[filterable_index_name]');

            Array.prototype.forEach.call(items, function(item, i) {
                if (
					item.getAttribute('filterable_index_name') == index_name
				 || index_name == ''
				) {
                    item.setAttribute('filterable_index', '');
                } else {
                    item.removeAttribute('filterable_index');
                }
            });
        },

        highlight_results: function(item, query) {
            // Note this can be really slow on large lists.
            if (window.Mark) {
                var markInstance = new Mark(item.querySelectorAll('[filterable_index], [filterable_index_name]'));
                markInstance.unmark({
                    done: function(){
                        markInstance.mark(query);
                    }
                });
            } else {
                if (!filterability.markjs_error_raised) {
                    console.error('Mark.js isn\'t loaded - could not highlight query results.');
                    filterability.markjs_error_raised = true;
                }
            }
        },

        closest: function(el, selector, stopSelector) {
            var retval = null;
            while (el) {
                if (el.matches(selector)) {
                    retval = el;
                    break;
                } else if (stopSelector && el.matches(stopSelector)) {
                    break;
                }
                el = el.parentElement;
            }
            return retval;
        },
        
        debounce: function(func, wait, immediate) {
            var timeout;
            return function() {
                var context = this, args = arguments;
                var later = function() {
                    timeout = null;
                    if (!immediate) func.apply(context, args);
                };
                var callNow = immediate && !timeout;
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
                if (callNow) func.apply(context, args);
            };
        }
	}

	ready(filterability.init);
})();