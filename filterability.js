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
				// Expose the form if necessary:
				var filterable_form_template = filterable_group.querySelector('[filterable_form_template]');
				if (filterable_form_template) {
					filterable_form = filterable_form_template.innerHTML;
					filterable_form_template.insertAdjacentHTML('afterend', filterable_form);
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


                // Attach search input handler:
                // @TODO: Could allow for different input actions to trigger this.
                // E.g. user may want to choose from a list of predefined options by which to filter
                // the list(s) so a select or checkbox change should work as well.
                var filterable_input = filterable_group.querySelector('[filterable_input]');
                filterable_input.addEventListener('keyup', function(){
                    filterability.filterList(filterable_group, this.value);
                });


                // Toggler stuff:
                var els = filterable_group.querySelector('[filterable_item]').querySelectorAll('[filterable_index_name]');
                filterability.filterable_index_names = Array.prototype.map.call(els, function(obj) {
                    return obj.getAttribute('filterable_index_name');
                });

                var filterable_toggles = filterable_group.querySelectorAll('[filterable_toggle]');
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
            });

        },

        generateIndex: function(group) {
            var items = group.querySelectorAll('[filterable_item]');
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
            var items = group.querySelectorAll('[filterable_item]');
            Array.prototype.forEach.call(items, function(item, i){
                if (item.getAttribute('filterable_index_string').indexOf(query) > -1) {
                    item.removeAttribute('hidden');

                    // Check we want to highlight results:
                    if (group.getAttribute('filterable_mark_results') === '') {
                        filterability.highlight_results(item, query);
                    }
                    
                } else {
                    item.setAttribute('hidden', '');
                }
            });


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
            if (window.Mark) {
                var markInstance = new Mark(item);
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
        }
	}

	ready(filterability.init);
})();
