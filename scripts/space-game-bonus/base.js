
(function() {
    'use strict';

    // ============================================================
    // HINT REVEAL
    // ============================================================

    document.querySelectorAll('.btn-hint').forEach(function(btn) {
        var step = btn.closest('.step');
        var hints = step.querySelectorAll('.hints-container .hint');
        var total = parseInt(btn.getAttribute('data-total'), 10);
        var revealed = 0;

        btn.addEventListener('click', function() {
            if (revealed < total) {
                hints[revealed].removeAttribute('hidden');
                hints[revealed].querySelectorAll('code.lua').forEach(highlightElement);
                revealed++;

                if (revealed < total) {
                    btn.textContent = 'Show Hint (' + (revealed + 1) + '/' + total + ')';
                } else {
                    // All hints revealed — hide hint button, show solution button
                    btn.setAttribute('hidden', '');
                    var solBtn = step.querySelector('.btn-solution');
                    if (solBtn) solBtn.removeAttribute('hidden');
                }
            }
        });
    });

    // ============================================================
    // SOLUTION REVEAL
    // ============================================================

    document.querySelectorAll('.btn-solution').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var step = btn.closest('.step');
            var sol = step.querySelector('.solution');
            if (sol) {
                var isHidden = sol.hasAttribute('hidden');
                if (isHidden) {
                    sol.removeAttribute('hidden');
                    btn.textContent = 'Hide Solution';
                    // Re-highlight any code blocks that were hidden
                    sol.querySelectorAll('code.lua').forEach(highlightElement);
                } else {
                    sol.setAttribute('hidden', '');
                    btn.textContent = 'Show Solution';
                }
            }
        });
    });

    // ============================================================
    // STUCK CODE TOGGLE
    // ============================================================

    document.querySelectorAll('.btn-stuck').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var stuck = btn.closest('.stuck');
            var codeDiv = stuck.querySelector('.stuck-code');
            if (codeDiv) {
                var isHidden = codeDiv.hasAttribute('hidden');
                if (isHidden) {
                    codeDiv.removeAttribute('hidden');
                    codeDiv.querySelectorAll('code.lua').forEach(highlightElement);
                } else {
                    codeDiv.setAttribute('hidden', '');
                }
            }
        });
    });

    // ============================================================
    // LUA SYNTAX HIGHLIGHTING
    // ============================================================

    var LUA_KEYWORDS = ['local','function','end','if','then','else','elseif',
        'for','do','while','return','break','and','or','not','in',
        'true','false','nil','repeat','until'];
    var kwSet = {};
    LUA_KEYWORDS.forEach(function(k) { kwSet[k] = true; });

    function escapeHTML(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function highlightLua(code) {
        var result = '';
        var i = 0;
        var len = code.length;

        while (i < len) {
            // Comment
            if (code[i] === '-' && i + 1 < len && code[i + 1] === '-') {
                var end = code.indexOf('\n', i);
                if (end === -1) end = len;
                result += '<span class="cm">' + escapeHTML(code.substring(i, end)) + '</span>';
                i = end;
            }
            // String (double quote)
            else if (code[i] === '"') {
                var j = i + 1;
                while (j < len && code[j] !== '"' && code[j] !== '\n') {
                    if (code[j] === '\\') j++;
                    j++;
                }
                if (j < len && code[j] === '"') j++;
                result += '<span class="str">' + escapeHTML(code.substring(i, j)) + '</span>';
                i = j;
            }
            // String (single quote)
            else if (code[i] === "'") {
                var j = i + 1;
                while (j < len && code[j] !== "'" && code[j] !== '\n') {
                    if (code[j] === '\\') j++;
                    j++;
                }
                if (j < len && code[j] === "'") j++;
                result += '<span class="str">' + escapeHTML(code.substring(i, j)) + '</span>';
                i = j;
            }
            // Number (not preceded by word char)
            else if (/[0-9]/.test(code[i]) && (i === 0 || !/[a-zA-Z_]/.test(code[i - 1]))) {
                var j = i;
                while (j < len && /[0-9.]/.test(code[j])) j++;
                result += '<span class="num">' + code.substring(i, j) + '</span>';
                i = j;
            }
            // Identifier / keyword
            else if (/[a-zA-Z_]/.test(code[i])) {
                var j = i;
                while (j < len && /[a-zA-Z0-9_]/.test(code[j])) j++;
                var word = code.substring(i, j);
                if (kwSet[word]) {
                    result += '<span class="kw">' + word + '</span>';
                } else {
                    // Check for function call (skip whitespace, look for '(')
                    var k = j;
                    while (k < len && code[k] === ' ') k++;
                    if (k < len && code[k] === '(') {
                        result += '<span class="fn">' + word + '</span>';
                    } else {
                        result += word;
                    }
                }
                i = j;
            }
            // Dot accessor — check if next word is a function call
            else if (code[i] === '.' && i + 1 < len && /[a-zA-Z_]/.test(code[i + 1])) {
                result += '.';
                i++;
            }
            // Other character
            else {
                result += escapeHTML(code[i]);
                i++;
            }
        }
        return result;
    }

    function highlightElement(el) {
        var raw = el.textContent;
        el.innerHTML = highlightLua(raw);
    }

    // Highlight all visible code blocks on load
    document.querySelectorAll('code.lua').forEach(function(el) {
        // Only highlight if the element is not inside a hidden container
        var parent = el.closest('[hidden]');
        if (!parent) {
            highlightElement(el);
        }
    });

    // ============================================================
    // ANTI-COPY-PASTE
    // ============================================================

    var toast = document.getElementById('toast');
    var toastTimer = null;

    function showToast() {
        toast.classList.add('show');
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(function() {
            toast.classList.remove('show');
        }, 2000);
    }

    // Block copy/cut on code blocks
    document.querySelectorAll('pre.code-block').forEach(function(block) {
        block.addEventListener('copy', function(e) {
            e.preventDefault();
            showToast();
        });
        block.addEventListener('cut', function(e) {
            e.preventDefault();
            showToast();
        });
    });

    // Also block on the whole document for code elements
    document.addEventListener('copy', function(e) {
        var sel = window.getSelection();
        if (sel && sel.anchorNode) {
            var node = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentNode : sel.anchorNode;
            if (node && node.closest && node.closest('pre.code-block')) {
                e.preventDefault();
                showToast();
            }
        }
    });

})();
