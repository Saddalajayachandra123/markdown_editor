const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const lineNumbers = document.getElementById('lineNumbers');
const wordCount = document.getElementById('wordCount');
const charCount = document.getElementById('charCount');
const lineCount = document.getElementById('lineCount');

let viewMode = 'split';
let autoSaveTimer;

function closeSplash() {
    document.getElementById('splash').style.animation = 'fadeOut 0.5s ease';
    setTimeout(() => {
        document.getElementById('splash').style.display = 'none';
    }, 500);
}

document.addEventListener('DOMContentLoaded', () => {
    loadFromStorage();
    updatePreview();
    updateStats();
    updateLineNumbers();
    
    setTimeout(closeSplash, 3000);
});

editor.addEventListener('input', () => {
    updatePreview();
    updateStats();
    updateLineNumbers();
    scheduleAutoSave();
});

editor.addEventListener('scroll', () => {
    lineNumbers.scrollTop = editor.scrollTop;
});

editor.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        switch(e.key.toLowerCase()) {
            case 'b':
                e.preventDefault();
                insertFormat('bold');
                break;
            case 'i':
                e.preventDefault();
                insertFormat('italic');
                break;
            case 'h':
                e.preventDefault();
                insertFormat('heading');
                break;
            case 'l':
                e.preventDefault();
                insertFormat('list');
                break;
            case 'k':
                e.preventDefault();
                insertFormat('link');
                break;
            case 'g':
                e.preventDefault();
                insertFormat('image');
                break;
            case '`':
                e.preventDefault();
                insertFormat('code');
                break;
            case 'q':
                e.preventDefault();
                insertFormat('quote');
                break;
            case 't':
                e.preventDefault();
                insertFormat('table');
                break;
        }
    }
    
    if (e.key === 'Tab') {
        e.preventDefault();
        insertAtCursor('    ');
    }
});

function updatePreview() {
    const markdown = editor.value;
    preview.innerHTML = parseMarkdown(markdown);
}

function parseMarkdown(md) {
    let html = md;
    
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');
    
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    html = html.replace(/^\> (.+)$/gim, '<blockquote>$1</blockquote>');
    
    html = html.replace(/^\* (.+)$/gim, '<ul><li>$1</li></ul>');
    html = html.replace(/^- (.+)$/gim, '<ul><li>$1</li></ul>');
    html = html.replace(/^\+ (.+)$/gim, '<ul><li>$1</li></ul>');
    html = html.replace(/^\d+\. (.+)$/gim, '<ol><li>$1</li></ol>');
    
    html = html.replace(/<\/ul>\s*<ul>/g, '');
    html = html.replace(/<\/ol>\s*<ol>/g, '');
    html = html.replace(/<\/blockquote>\s*<blockquote>/g, '<br>');
    
    html = html.replace(/^\|(.+)\|$/gim, (match) => {
        const cells = match.split('|').filter(cell => cell.trim());
        const isHeader = cells.every(cell => cell.trim().match(/^[-:]+$/));
        
        if (isHeader) return '';
        
        const cellTags = cells.map(cell => `<td>${cell.trim()}</td>`).join('');
        return `<tr>${cellTags}</tr>`;
    });
    
    html = html.replace(/(<tr>[\s\S]+?<\/tr>)/g, '<table>$1</table>');
    html = html.replace(/<table>\s*<table>/g, '<table>');
    html = html.replace(/<\/table>\s*<\/table>/g, '</table>');
    
    const tableRegex = /<table>([\s\S]*?)<\/table>/g;
    html = html.replace(tableRegex, (match, content) => {
        const rows = content.match(/<tr>[\s\S]*?<\/tr>/g);
        if (rows && rows.length > 0) {
            const firstRow = rows[0].replace(/<td>/g, '<th>').replace(/<\/td>/g, '</th>');
            const restRows = rows.slice(1).join('');
            return `<table>${firstRow}${restRows}</table>`;
        }
        return match;
    });
    
    html = html.replace(/^---$/gim, '<hr>');
    html = html.replace(/^\*\*\*$/gim, '<hr>');
    
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/^(?!<[h|u|o|b|p|t|i|c|a])/gim, '<p>');
    html = html.replace(/(?!<\/[h|u|o|b|p|t|i|c|a]>)$/gim, '</p>');
    
    return html;
}

function updateStats() {
    const text = editor.value;
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const chars = text.length;
    const lines = text.split('\n').length;
    
    wordCount.textContent = `${words} words`;
    charCount.textContent = `${chars} chars`;
    lineCount.textContent = `${lines} lines`;
}

function updateLineNumbers() {
    const lines = editor.value.split('\n').length;
    lineNumbers.innerHTML = Array.from({length: lines}, (_, i) => i + 1).join('\n');
}

function insertFormat(type) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = editor.value.substring(start, end);
    const beforeText = editor.value.substring(0, start);
    const afterText = editor.value.substring(end);
    
    let replacement = '';
    let cursorOffset = 0;
    
    switch(type) {
        case 'bold':
            replacement = `**${selectedText || 'bold text'}**`;
            cursorOffset = selectedText ? replacement.length : 2;
            break;
        case 'italic':
            replacement = `*${selectedText || 'italic text'}*`;
            cursorOffset = selectedText ? replacement.length : 1;
            break;
        case 'heading':
            replacement = `## ${selectedText || 'Heading'}`;
            cursorOffset = replacement.length;
            break;
        case 'list':
            replacement = `- ${selectedText || 'List item'}`;
            cursorOffset = replacement.length;
            break;
        case 'link':
            replacement = `[${selectedText || 'link text'}](url)`;
            cursorOffset = selectedText ? replacement.length - 4 : 1;
            break;
        case 'image':
            replacement = `![${selectedText || 'alt text'}](image-url)`;
            cursorOffset = selectedText ? replacement.length - 11 : 2;
            break;
        case 'code':
            if (selectedText.includes('\n')) {
                replacement = `\`\`\`\n${selectedText || 'code'}\n\`\`\``;
                cursorOffset = selectedText ? replacement.length - 4 : 4;
            } else {
                replacement = `\`${selectedText || 'code'}\``;
                cursorOffset = selectedText ? replacement.length : 1;
            }
            break;
        case 'quote':
            replacement = `> ${selectedText || 'Quote'}`;
            cursorOffset = replacement.length;
            break;
        case 'table':
            replacement = `| Header 1 | Header 2 | Header 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |`;
            cursorOffset = replacement.length;
            break;
        case 'hr':
            replacement = '\n---\n';
            cursorOffset = replacement.length;
            break;
    }
    
    editor.value = beforeText + replacement + afterText;
    editor.focus();
    editor.setSelectionRange(start + cursorOffset, start + cursorOffset);
    
    updatePreview();
    updateStats();
    updateLineNumbers();
    scheduleAutoSave();
}

function insertAtCursor(text) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const beforeText = editor.value.substring(0, start);
    const afterText = editor.value.substring(end);
    
    editor.value = beforeText + text + afterText;
    editor.setSelectionRange(start + text.length, start + text.length);
    
    updatePreview();
    updateStats();
    updateLineNumbers();
}

function toggleTheme() {
    document.body.classList.toggle('light');
    localStorage.setItem('theme', document.body.classList.contains('light') ? 'light' : 'dark');
}

function toggleView() {
    const modes = ['split', 'editor-only', 'preview-only'];
    const currentIndex = modes.indexOf(viewMode);
    viewMode = modes[(currentIndex + 1) % modes.length];
    
    document.getElementById('container').className = `container ${viewMode}`;
}

function toggleFullscreen() {
    document.body.classList.toggle('fullscreen');
}

function newDocument() {
    if (editor.value.trim() && !confirm('Create new document? Unsaved changes will be lost.')) {
        return;
    }
    editor.value = '';
    updatePreview();
    updateStats();
    updateLineNumbers();
    localStorage.removeItem('markdown-content');
}

function clearEditor() {
    if (confirm('Clear all content? This cannot be undone.')) {
        editor.value = '';
        updatePreview();
        updateStats();
        updateLineNumbers();
        localStorage.removeItem('markdown-content');
    }
}

function downloadMd() {
    const content = editor.value;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `document-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
}

function scheduleAutoSave() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        localStorage.setItem('markdown-content', editor.value);
        localStorage.setItem('last-saved', new Date().toISOString());
    }, 1000);
}

function loadFromStorage() {
    const saved = localStorage.getItem('markdown-content');
    const theme = localStorage.getItem('theme');
    
    if (saved) {
        editor.value = saved;
    }
    
    if (theme === 'light') {
        document.body.classList.add('light');
    }
}

const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(style);
