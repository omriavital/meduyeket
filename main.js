"use strict";

// A word guessing game inspired by Wordle
// Copyright (C) 2022  Amir Livne Bar-on
// 
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// 
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.


function cyrb53(str) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1>>>16), 2246822507) ^ Math.imul(h2 ^ (h2>>>13), 3266489909);
    h2 = Math.imul(h2 ^ (h2>>>16), 2246822507) ^ Math.imul(h1 ^ (h1>>>13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1>>>0);
};

function get_date() {
    return new Date().toLocaleDateString('he-IL', {timeZone: 'Asia/Jerusalem'});
}

const HEBREW_LETTERS = "אבגדהוזחטיכלמנסעפצקרשתךםןףץ";
const HEBREW_KEYBOARD = "tcdsvuzjyhfknbxgpmera,loi;.";
let today = get_date();
let word_of_the_day = WORDS[cyrb53('meduyeket ' + today) % WORDS.length];
let guesses = [];


function get_matches(guess, truth) {
    const not_exact_matches = [];
    for (let i = 0; i < 5; i++)
        if (guess[i] !== truth[i])
            not_exact_matches.push(truth[i]);

    const matches = [];
    for (let i = 0; i < 5; i++) {
        if (guess[i] === truth[i]) {
            matches.push('exact');
            continue;
        }
        const index = not_exact_matches.indexOf(guess[i]);
        if (index === -1) {
            matches.push('wrong');
        } else {
            not_exact_matches.splice(index, 1);
            matches.push('other');
        }
    }
    return matches;
}

function set_modal_state() {
    switch (history.state) {
        case 'help':
            document.getElementById('modal').classList.remove('hidden');
            document.getElementById('help-screen').classList.remove('hidden');
            document.getElementById('help-screen').scrollTop = 0;
            document.getElementById('success-screen').classList.add('hidden');
            break;

        case 'success':
            document.getElementById('modal').classList.remove('hidden');
            document.getElementById('help-screen').classList.add('hidden');
            document.getElementById('success-screen').classList.remove('hidden');
            document.getElementById('success-header').innerText =
                guesses[guesses.length - 1] === word_of_the_day ? 'כל הכבוד!' : 'לא הצליח הפעם';

            const rows = guesses.map(function(guess) {
                return get_matches(guess, word_of_the_day).map(function(match) {
                    return {exact: '🟩', other: '🟨', wrong: '⬜'}[match];
                }).join('');
            });
            document.getElementById('result').innerText = `מדויקת ${today} - ${guesses[guesses.length - 1] === word_of_the_day ? guesses.length : 'X'}/6\n` + rows.join('\n');
            countdown();
            break;

        default:
            document.getElementById('modal').classList.add('hidden');
    }
}
function show_help() {
    if (history.state !== 'help') {
        if (history.state === 'success')
            history.replaceState('help', '');
        else
            history.pushState('help', '');
    }
    set_modal_state();
}

function show_success_screen() {
    if (history.state !== 'success') {
        if (history.state === 'help')
            history.replaceState('success', '');
        else
            history.pushState('success', '');
    }
    set_modal_state();
}

function copy_result(event) {
    navigator.clipboard.writeText(document.getElementById('result').innerText);
    popup('התוצאה הועתקה, אפשר להדביק עם Ctrl+V')
    event.stopPropagation();
}

function countdown() {
    if (document.getElementById('modal').classList.contains('hidden'))
        return;
    if (document.getElementById('success-screen').classList.contains('hidden'))
        return;

    const time_str = new Date().toLocaleTimeString('he-IL', {timeZone: 'Asia/Jerusalem', hourCycle: 'h24'});
    const [hours, minutes, seconds] = time_str.split(':').map(function(x) {return parseInt(x);});
    const since_midnight = 3600 * hours + 60 * minutes + seconds;
    const to_midnight = 3600 * 24 - since_midnight;
    document.getElementById('countdown').innerText =
        `${Math.trunc(to_midnight / 3600)}:${two_digits((to_midnight % 3600) / 60)}:${two_digits(to_midnight % 60)}`;
    window.setTimeout(countdown, 1000 - new Date().getMilliseconds());
}

function two_digits(x) {
    x = Math.trunc(x);
    if (x < 10)
        return '0' + x.toString();
    else
        return x.toString();
}

function hide_modal() {
    if (history.state === 'help' || history.state === 'success')
        history.back();
    set_modal_state();
}

function popup(text) {
    document.getElementById('popup').classList.remove('hidden');
    document.getElementById('popup').innerText = text;
    window.setTimeout(function() {
        document.getElementById('popup').classList.add('hidden');
    }, 1500);
}

function type_letter(letter) {
    const row = guesses.length + 1;
    for (let i = 1; i <= 5; i++) {
        const elt = document.getElementById(`letter-${row}-${i}`);
        if (elt.innerText === '') {
            elt.classList.add('full');
            elt.innerText = letter;
            break;
        }
    }
}

function erase_letter() {
    const row = guesses.length + 1;
    for (let i = 5; i >= 1; i--) {
        const elt = document.getElementById(`letter-${row}-${i}`);
        if (elt.innerText !== '') {
            elt.classList.remove('full');
            elt.innerText = '';
            break;
        }
    }
}

function make_guess() {
    const row = guesses.length + 1;
    let guess = '';
    for (let i = 1; i <= 5; i++) {
        const elt = document.getElementById(`letter-${row}-${i}`);
        guess += elt.innerText;
    }

    if (guess.length < 5) {
        const row_elt = document.getElementById(`guess-${row}`);
        row_elt.classList.add('jiggle');
        window.setTimeout(function() {row_elt.classList.remove('jiggle');}, 2000);
        popup('אין מספיק אותיות');
        return;
    }
    if (WORDS.indexOf(guess) === -1) {
        const row_elt = document.getElementById(`guess-${row}`);
        row_elt.classList.add('jiggle');
        window.setTimeout(function() {row_elt.classList.remove('jiggle');}, 2000);
        popup('לא ברשימת המילים');
        return;
    }

    const matches = get_matches(guess, word_of_the_day);
    for (let i = 1; i <= 5; i++) {
        const elt = document.getElementById(`letter-${row}-${i}`);
        elt.classList.remove('full');
        elt.classList.add(matches[i-1]);
    }
    guesses.push(guess);
    save_to_local_storage();
    if (guess === word_of_the_day) {
        add_result_to_local_storage();
        const row_elt = document.getElementById(`guess-${row}`);
        row_elt.classList.add('win');
        const CONGRATULATIONS = ['גאוני', 'מדהים', 'נפלא', 'סחתיין', 'נהדר', 'מקסים'];
        popup(CONGRATULATIONS[guesses.length - 1]);
        window.setTimeout(show_success_screen, 3600);
    } else {
        window.setTimeout(set_keyboard_key_colors, 100);
        if (guesses.length === 6) {
            add_result_to_local_storage();
            document.getElementById('popup').classList.remove('hidden');
            document.getElementById('popup').innerText = word_of_the_day;
            window.setTimeout(show_success_screen, 2000);
        }
    }
}

function set_keyboard_key_colors() {
    let letter_states = {};
    for (const guess of guesses) {
        if (guess !== word_of_the_day) {
            const matches = get_matches(guess, word_of_the_day);
            for (let i = 0; i < 5; i++) {
                if (matches[i] === 'exact')
                    letter_states[guess[i]] = 'exact';
                else if (matches[i] === 'other' && letter_states[guess[i]] !== 'exact')
                    letter_states[guess[i]] = 'other';
                else if (matches[i] === 'wrong' && !letter_states.hasOwnProperty(guess[i]))
                    letter_states[guess[i]] = 'wrong';
            }
        }
    }
    for (const elt of document.getElementsByClassName('key')) {
        const letter = elt.innerText;
        if (letter.length === 1 && HEBREW_LETTERS.indexOf(letter) !== -1) {
            elt.setAttribute('match', letter_states[letter]);
        }    
    }
}

function handle_key(key) {
    if (guesses.length === 6)
        return;
    if (guesses.length > 0 && guesses[guesses.length - 1] === word_of_the_day)
        return;

    if (HEBREW_LETTERS.indexOf(key) !== -1)
        type_letter(key);
    else if (HEBREW_KEYBOARD.indexOf(key) !== -1)
        type_letter(HEBREW_LETTERS[HEBREW_KEYBOARD.indexOf(key)]);
    else if (key === 'Backspace')
        erase_letter();
    else if (key === 'Enter')
        make_guess();
}

function handle_on_screen_keyboard_click(event) {
    const letter = event.currentTarget.innerText;
    if (letter.length === 1 && HEBREW_LETTERS.indexOf(letter) !== -1)
        handle_key(letter);
    else
        handle_key(event.currentTarget.getAttribute('value'));
}

function save_to_local_storage() {
    localStorage.setItem('date', today);
    localStorage.setItem('guesses', JSON.stringify(guesses));
}

function add_result_to_local_storage() {
    let results = localStorage.getItem('results');
    if (results)
        results = JSON.parse(results);
    else
        results = [];
    results.push(guesses[guesses.length - 1] === word_of_the_day ? guesses.length : 'X');
    localStorage.setItem('results', JSON.stringify(results));
}

function load_from_local_storage() {
    const date = localStorage.getItem('date');
    if (!date) {
        show_help();
        return;
    }
    if (date !== today) {
        localStorage.removeItem('date');
        localStorage.removeItem('guesses');
        return;
    }
    guesses = JSON.parse(localStorage.getItem('guesses'));
    for (let i = 0; i < guesses.length; i++) {
        const guess = guesses[i];
        const matches = get_matches(guess, word_of_the_day);
        for (let j = 0; j < 5; j++) {
            const elt = document.getElementById(`letter-${i+1}-${j+1}`);
            elt.classList.add(matches[j]);
            elt.innerText = guess[j];
        }
    }
    if (guesses[guesses.length - 1] === word_of_the_day || guesses.length === 6) {
        window.setTimeout(show_success_screen, 500);
    }
    set_keyboard_key_colors();
}

document.addEventListener('DOMContentLoaded', function () {
    load_from_local_storage();
    save_to_local_storage();
    document.getElementById('help-button').addEventListener('click', show_help);
    document.getElementById('copy-button').addEventListener('click', copy_result);
    document.getElementById('modal').addEventListener('click', hide_modal);
    document.body.addEventListener('keydown', function(event) {
        if (event.ctrlKey || event.altKey)
            return;

        if (event.key === '?')
            show_help();
        else if (event.key === 'Escape')
            hide_modal();
        else
            handle_key(event.key);
    });
    for (const elt of document.getElementsByClassName('key'))
        elt.addEventListener('click', handle_on_screen_keyboard_click);
    set_modal_state();
    window.addEventListener('popstate', set_modal_state);
});

console.log('While debugging, the following command clears the saved guesses:')
console.log('localStorage.setItem("guesses", "[]")')
