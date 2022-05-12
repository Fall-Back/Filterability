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
    };

    var getSelectValues = function(select) {
        var result = [];
        var options = select && select.options;
        var opt;

        for (var i=0, iLen=options.length; i<iLen; i++) {
            opt = options[i];

            if (opt.selected) {
                result.push(opt.value || opt.text);
            }
        }
        return result;
    };

    var setSelectValues = function(select, values) {
        var options = select && select.options;
        var opt;

        for (var i=0, iLen=options.length; i<iLen; i++) {
            opt = options[i];

            if (values.indexOf(opt.value) !== -1) {
                opt.selected = true;
            } else {
                opt.selected = false;
            }
        }
        return true;
    };

    var getParameterByName = function(name, url) {
        url = (typeof url !== 'undefined') ?  url : window.location.href;
        name = name.replace(/[\[\]]/g, '\\$&');
        var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, ' '));
    };

    var resetPreset = function(form) {
        els = form.querySelectorAll('[filterable_preset]');

        Array.prototype.forEach.call(els, function(el, i) {
            var el_tagName = el.tagName.toLowerCase();

            if (el_tagName == 'select') {
                setSelectValues(el, []);
            } else if (el_tagName == 'input' && (el.getAttribute('type') == 'checkbox' || el.getAttribute('type') == 'radio')) {
                el.checked = false;
            }
        });
    };

    var triggerEvent = function(element, event_type) {

        //console.log(element, event_type);
        setTimeout(function() {
            var event = document.createEvent('Event');
            event.initEvent(event_type, true, false);
            element.dispatchEvent(event);
        }, 1);


    }

    var filterability = {

        markjs_error_raised: false,
        filterable_index_names: [],

        init: function() {
            // Look for all `filterable_group`:
            var filterable_groups = document.querySelectorAll('[filterable_group]');

            Array.prototype.forEach.call(filterable_groups, function(filterable_group, i) {

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
                var filterable_form;
                var form_added = false;
                if (filterable_form_template) {
                    filterable_form = filterable_form_template.innerHTML;

                    // Check for a replace selector, and put the form there, otherwise keep it in
                    // place:
                    var replace_selector = filterable_group.getAttribute('filterable_replace');
                    if (replace_selector) {
                        var replace_el = document.querySelector(replace_selector);
                        var form_el = document.createElement('div');
                        form_el.id  = 'filterable_form_' + i;
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
                var filterable_empty_list;
                if (filterable_empty_list_template) {
                    filterable_empty_list = filterable_empty_list_template.innerHTML;
                } else {
                    // Might as well provide a default:
                    var filterable_empty_list_message = 'No matches found.';
                    var filterable_empty_list_element = document.createElement('p');
                    filterable_empty_list_element.textContent = filterable_empty_list_message;
                    filterable_empty_list_element.setAttribute('filterable_empty_list_message', '');
                    filterable_empty_list_element.setAttribute('hidden', '');
                    filterable_empty_list = filterable_empty_list_element.outerHTML;
                }

                // I can't remember why I assumed there could be more than one list in a group, but
                // I really can't see how there could be, so changing this to assume a single list:
                //var filterable_lists = filterable_group.querySelectorAll('[filterable_list]');
                //Array.prototype.forEach.call(filterable_lists, function(filterable_list, i) {
                //    filterable_list.insertAdjacentHTML('afterend', filterable_empty_list);
                //});
                var filterable_list = filterable_group.querySelector('[filterable_list]');
                filterable_list.insertAdjacentHTML('afterend', filterable_empty_list);


                if (typeof form_added  === 'string') {
                    filterable_form = document.querySelector('#' + form_added);
                } else {
                    filterable_form = filterable_group;
                }

                if (!filterable_form) {
                    console.error('Could not find form.');
                    return;
                }

                // Get the input:
                var filterable_input = filterable_form.querySelector('[filterable_input]');

                // Check if there's sessionStorage for the input and use that value:
                filterable_input.value = window.sessionStorage.getItem(filterable_input.id);

                // Check if there's a corresponding query string parameter and use that value:
                var input_val;
                if (input_val = getParameterByName(filterable_input.id)) {
                    filterable_input.value = input_val;
                }

                // Trigger change event not natively fired:
                triggerEvent(filterable_input, 'change');


                // Check for presence of a submit button:
                var filterable_submit = filterable_form.querySelector('[filterable_submit]');

                // If there is one, we want to attach the hander, otherwise, filter on keyup:
                if (filterable_submit) {
                    filterable_submit.addEventListener('click', function(e) {
                        e.preventDefault();

                        // Add value to sessionStorage:
                        window.sessionStorage.setItem(filterable_input.id, filterable_input.value);

                        // Filter the list:
                        filterability.filterList(filterable_group, filterable_input.value);
                        return false;
                    });
                } else {

                    // Attach search input handler:
                    // @TODO: Could allow for different input actions to trigger this.
                    // E.g. user may want to choose from a list of predefined options by which to filter
                    // the list(s) so a select or checkbox change should work as well.

                    filterable_input.addEventListener('keyup', function(e) {
                        // Add value to sessionStorage:
                        window.sessionStorage.setItem(filterable_input.id, this.value);

                        // Filter the list:
                        filterability.filterList(filterable_group, this.value);
                    });
                }

                // Prevent the form being submitted ever:
                // - No a form may have a legitmate need to be be filterable AND be submitted.
                // - use input[type="button"] to prevent submits instead.
                /*filterable_input.form.addEventListener('submit', function(e) {
                    e.preventDefault();
                    return false;
                });*/


                // Toggler stuff:
                var filterable_toggles = filterable_form.querySelectorAll('[filterable_toggle]');

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
                        if (el_tagName === 'select' || (el_tagName === 'input' && ['checkbox', 'radio'].indexOf(el_type) > -1)) {
                            // Check if the value matches the ones available in the data (or empty string for ALL):
                            if (
                                filterability.filterable_index_names.indexOf(filterable_toggle.getAttribute('filterable_toggle')) > -1
                             || filterable_toggle.getAttribute('filterable_toggle') === ''
                            ) {
                                // Add the event listener:
                                filterable_toggle.addEventListener('change', function(e) {
                                    filterability.toggle_index(filterable_group, this.getAttribute('filterable_toggle'));
                                    filterability.generateIndex(filterable_group);
                                    filterability.filterList(filterable_group, filterable_input.value);

                                    //console.log(el_tagName + ' toggler ' + el_type);

                                    // Add value to sessionStorage:
                                    window.sessionStorage.setItem(filterable_input.id + '.filterable_toggle', this.getAttribute('filterable_toggle'));
                                });

                                // Check the sessionStorage and query string parameter to see if one should be checked:
                                var toggle_val = window.sessionStorage.getItem(filterable_input.id + '.filterable_toggle');

                                var qs_toggle;
                                if (qs_toggle = getParameterByName(filterable_input.id + '.filterable_toggle')) {
                                    toggle_val = qs_toggle;
                                }

                                if (toggle_val && toggle_val == filterable_toggle.getAttribute('filterable_toggle')) {
                                    filterable_toggle.click();
                                }
                            }
                        }
                    });

                }


                // Exclusion stuff:
                filterability.update_exclusions(filterable_group, filterable_form);

                var excludable_toggles = filterable_form.querySelectorAll('[filterable_exclude_container][filterable_exclude_match]');

                if (excludable_toggles.length > 0) {
                    Array.prototype.forEach.call(excludable_toggles, function(excludable_toggle, i) {
                        var el_tagName = excludable_toggle.tagName.toLowerCase();
                        var el_type = excludable_toggle.type;
                        if (el_type) {
                            el_type = el_type.toLowerCase();
                        }
                        // Check element is of valid / supported type:
                        if (el_tagName === 'input' && ['checkbox'].indexOf(el_type) > -1) {
                            excludable_toggle.addEventListener('change', function(e) {
                                filterability.update_exclusions(filterable_group, filterable_form);
                            });
                        }
                    });
                }

                // Check for presence of a reset button:
                var filterable_reset = filterable_form.querySelector('[filterable_reset]');
                if (filterable_reset) {
                    filterable_reset.addEventListener('click', function(e) {

                        // We need this to happen AFTER reset has completed, so use a timeout:
                        setTimeout(function() {
                            // Clear the sessionStorage:
                            window.sessionStorage.removeItem(filterable_input.id);
                            window.sessionStorage.removeItem(filterable_input.id + '.filterable_toggle');

                            // 'Reset' doesn't re-trigger the toggler stuff, so do that here:
                            var event = document.createEvent('HTMLEvents');
                            event.initEvent('change', true, false);

                            var toggler_selects = filterable_form.querySelectorAll('select[filterable_toggle]');
                            Array.prototype.forEach.call(toggler_selects, function(toggler_select, i) {
                                toggler_select.dispatchEvent(event);
                            });

                            var toggler_checkradios = filterable_form.querySelectorAll('[filterable_toggle]:checked');
                            Array.prototype.forEach.call(toggler_checkradios, function(toggler_checkradio, i) {

                                //console.log(toggler_checkradio);
                                toggler_checkradio.dispatchEvent(event);
                            });


                            filterability.filterList(filterable_group, '');
                        }, 10);
                    });
                }

                // Allow values pre-filled by the browser to update the list:
                window.setTimeout(function(){
                    filterability.trigger_filter(filterable_submit, filterable_input);
                }, 100);


                // Add behaviour to preset inputs:
                var preset_inputs = filterable_form.querySelectorAll('[filterable_preset]');

                if (preset_inputs.length > 0) {

                    /* I'm not sure I really need a form input for this, but leave here for reference:
                    // Add a hidden input to store the preset origin so we can restore the form
                    // element UI state accross page loads:
                    var preset_origin = document.createElement('input');
                    preset_origin.setAttribute('type', 'hidden');
                    preset_origin.setAttribute('filterable_input_preset_origin', '');

                    filterable_form.querySelector('form').appendChild(preset_origin);
                    */

                    Array.prototype.forEach.call(preset_inputs, function(preset_input, i) {

                        preset_input.addEventListener('change', function(e) {
                            e.preventDefault();

                            var el = e.target;

                            var el_tagName = preset_input.tagName.toLowerCase();

                            if (el_tagName == 'select') {
                                var selected_values = getSelectValues(el);

                                resetPreset(el.form);
                                setSelectValues(el, selected_values);

                                filterable_input.value = selected_values.join('|');

                            } else if (el_tagName == 'input' && el.getAttribute('type') == 'checkbox') {
                                // Get all check boxes with the same name as they're series:
                                var values = [];
                                var el_name = el.getAttribute('name');

                                var checkboxes = filterable_form.querySelectorAll('input[name="' + el_name + '"]:checked');
                                Array.prototype.forEach.call(checkboxes, function(checkbox, i) {
                                    values.push(checkbox.value);
                                });

                                resetPreset(el.form);
                                Array.prototype.forEach.call(checkboxes, function(checkbox, i) {
                                    if(values.indexOf(checkbox.value) !== -1) {
                                        checkbox.checked = true;
                                    }
                                });


                                filterable_input.value = values.join('|');
                            } else {
                                filterable_input.value = el.value;
                            }

                            // Trigger change event not natively fired:
                            triggerEvent(filterable_input, 'change');

                            // Store the preset origin:
                            //preset_origin.value = el.name;
                            window.sessionStorage.setItem(filterable_input.preset_origin, el.name);

                            filterability.trigger_filter(filterable_submit, filterable_input);
                        });

                        // If the preset origin has been set, update the form UI:
                        /*if (
                            window.sessionStorage.getItem(filterable_input.preset_origin) == preset_input.name
                         || preset_origin.value == preset_input.name
                        ) {*/
                        if (window.sessionStorage.getItem(filterable_input.preset_origin) == preset_input.name) {

                            // This element was recorded as the preset origin.

                            var existing_value = filterable_input.value;
                            var existing_value_array = existing_value.split('|');
                            var el_tagName = preset_input.tagName.toLowerCase();

                            if (el_tagName == 'select') {
                                setSelectValues(preset_input, existing_value_array);
                            } else if (el_tagName == 'input' && preset_input.getAttribute('type') == 'checkbox') {
                                if (existing_value_array.indexOf(preset_input.value) !== -1) {
                                    preset_input.checked = true;
                                }
                            }
                        }

                    });
                }

                // Observe the list in case something else makes changes to it (e.g. Sortability)
                // and re-run the filter so everything stays as it should (e.g. odd/even attribs)
                // From https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver

                var observe_list = function(list) {
                    filterability.trigger_filter(filterable_submit, filterable_input);
                }

                // As mentioned above, I wrote this with the (odd) assumption there could be more
                // than one list in a group and I can't see how that could be, but if I remember
                // then this needs to be a loop as well:

                // Options for the observer (which mutations to observe)
                //var config = { attributes: true, childList: true, subtree: true };
                var config = {childList: true};

                // Callback function to execute when mutations are observed
                var callback = function(mutationsList, observer) {
                    observe_list(filterable_list);
                };

                // Create an observer instance linked to the callback function
                var observer = new MutationObserver(callback);

                // Start observing the target node for configured mutations
                observer.observe(filterable_list, config);


            });

        },

        trigger_filter: function(filterable_submit, filterable_input) {
            if (filterable_submit) {
                filterable_submit.click();
            } else {
                var kbd_evt;

                try {
                    kbd_evt = new KeyboardEvent('keyup', {'key': '13', 'bubbles': true});
                } catch (e) {
                    kbd_evt = document.createEvent('KeyboardEvent');
                    kbd_evt.initKeyboardEvent(
                        'keyup',
                        false,
                        false,
                        null,
                        '13',
                        0,
                        '',
                        false,
                        ''
                    );
                }

                filterable_input.dispatchEvent(kbd_evt);
            }
        },

        update_exclusions: function(group, form) {
            group.exclusions = {
                length: 0,
                keys: []
            };
            var excludable_toggles = form.querySelectorAll('[filterable_exclude_container][filterable_exclude_match]');

            if (excludable_toggles.length > 0) {
                Array.prototype.forEach.call(excludable_toggles, function(excludable_toggle, i) {

                    if (!excludable_toggle.checked) {

                        var container_name = excludable_toggle.getAttribute('filterable_exclude_container');

                        if (group.exclusions[container_name] === undefined) {
                            group.exclusions[container_name] = [];
                        }

                        group.exclusions[container_name].push(excludable_toggle.getAttribute('filterable_exclude_match'));
                        group.exclusions.length++;
                        group.exclusions.keys.push(container_name);
                    }
                });

                var filterable_input = form.querySelector('[filterable_input]');
                filterability.filterList(group, filterable_input.value);
            }
        },

        generateIndex: function(group) {
            var items = group.querySelectorAll('[filterable_item]');
            var index_string;
            Array.prototype.forEach.call(items, function(item, i){
                if (item.getAttribute('filterable_index') === '') {
                    index_string = item.textContent;
                } else {
                    var indexes = item.querySelectorAll('[filterable_index]');

                    // @TODO: there's probably a more concise way of doing this. Need to ++ my JS. :-(
                    index_string = '';

                    Array.prototype.forEach.call(indexes, function(index, i) {
                        index_string += index.textContent + ' ';
                    });
                }

                // Tidy index string:
                index_string = index_string.toLowerCase().trim();
                index_string = index_string.replace(/\s{2,}/g, '');

                item.setAttribute('filterable_index_string', index_string);
            });
        },

        filterList: function(group, query) {

            query = query.toLowerCase().trim();
            var items = group.querySelectorAll('[filterable_item]');
            var odd_even = 'odd';

            Array.prototype.forEach.call(items, function(item, i) {
                // Apply exclusions:
                var skip = false;
                if (group.exclusions && group.exclusions.length > 0) {
                    Array.prototype.forEach.call(group.exclusions.keys, function(ex_el_name) {
                        Array.prototype.forEach.call(group.exclusions[ex_el_name], function(ex_match) {
                            var re = new RegExp(ex_match);
                            var ex_el = item.querySelector(ex_el_name);
                            var match = re.exec(ex_el.innerHTML);
                            if (match !== null) {
                                skip = true;
                            }
                        });
                    });
                }

                item.removeAttribute('hidden');
                item.removeAttribute('filterable_visible_item');
                if (skip) {
                    item.setAttribute('hidden', '');
                    return;
                }

                // Tidy query in case it was entered in a more readable way:
                query = query.replace(' |', '|');
                query = query.replace('| ', '|');

                var regex = new RegExp('(' + query + ')', 'g');
                var str_to_test = item.getAttribute('filterable_index_string');

                if (regex.test(str_to_test)) {
                    //item.removeAttribute('hidden');

                    item.setAttribute('filterable_visible_item', odd_even);
                    odd_even = odd_even == 'odd' ? 'even' : 'odd';

                    // Check we want to highlight results:
                    if (group.getAttribute('filterable_mark_results') === '') {
                        filterability.debounce(filterability.highlight_results(item, regex, str_to_test), 250);
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
                var n_items       = list.querySelectorAll('[filterable_item]:not([hidden])').length;
                var list_is_empty = !n_items;
                var empty_message = list.nextElementSibling;
                // @TODO: should probably check the we've really selected a `filterable_empty_list_message`

                list.setAttribute('filterable_visibile_items', n_items);

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
                    item.getAttribute('filterable_index_name') === index_name
                 || index_name === ''
                ) {
                    item.setAttribute('filterable_index', '');
                } else {
                    item.removeAttribute('filterable_index');
                }
            });
        },

        //highlight_results: function(item, query) {
        highlight_results: function(item, regex, str_to_test) {
            // Note this can be really slow on large lists.
            if (window.Mark) {
                var markInstance = new Mark(item.querySelectorAll('[filterable_index], [filterable_index_name]'));
                markInstance.unmark({
                    done: function(){
                        var matches = str_to_test.match(regex);
                        Array.prototype.forEach.call(matches, function(match, i) {
                            markInstance.mark(match);
                        });
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
                var context = this;
                var args = arguments;
                var later = function() {
                    timeout = null;
                    if (!immediate) {
                        func.apply(context, args);
                    }
                };
                var callNow = immediate && !timeout;
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
                if (callNow) {
                    func.apply(context, args);
                }
            };
        }

    };

    ready(filterability.init);
})();