class decn_hintdict {
    constructor(options) {
        this.options = options;
        this.maxexample = 2;
        this.word = '';
    }

    async displayName() {
        let locale = await api.locale();
        if (locale.indexOf('CN') != -1) return '德汉';
        if (locale.indexOf('TW') != -1) return '德汉';
        return 'DE->CN Dict';
    }

    setOptions(options) {
        this.options = options;
        this.maxexample = options.maxexample;
    }

    async findTerm(word) {
        this.word = word;
        if (!word) return null;

        let base = 'http://www.godic.net/dicts/prefix/';
        let url = base + encodeURIComponent(word);
        try {
            let terms = JSON.parse(await api.fetch(url));
            if (terms.length == 0) return null;
            terms = terms.filter(term => term.value && term.recordid && term.recordtype != 'CG');
            terms = terms.slice(0, 2); //max 2 results;
            let queries = terms.map(term => this.findEudict(`http://www.godic.net/dicts/de/${term.value}?recordid=${term.recordid}`));
            let results = await Promise.all(queries);
            return [].concat(...results).filter(x => x);
        } catch (err) {
            return null;
        }
    }

    removeTags(elem, name) {
        let tags = elem.querySelectorAll(name);
        tags.forEach(x => {
            x.outerHTML = '';
        });
    }

    async findEudict(url) {
        let notes = [];

        function T(node) {
            if (!node)
                return '';
            else
                return node.innerText.trim();
        }

        let doc = '';
        try {
            let data = await api.fetch(url);
            let parser = new DOMParser();
            doc = parser.parseFromString(data, 'text/html');
        } catch (err) {
            return [];
        }

        let headsection = doc.querySelector('#dict-body>#exp-head');
        if (!headsection) return null;
        let expression = T(headsection.querySelector('.word'));
        if (!expression) return null;
        let reading = T(headsection.querySelector('.Phonitic'));

        let extrainfo = '';
        let cets = headsection.querySelectorAll('.tag');
        for (const cet of cets) {
            extrainfo += `<span class="cet">${T(cet)}</span>`;
        }

        let audios = [];
        try {
            audios[0] = 'http://api.frdic.com/api/v2/speech/speakweb?' + headsection.querySelector('.voice-js').dataset.rel;
        } catch (err) {
            audios = [];
        }

        let content = doc.querySelector('#ExpFCChild') || '';
        if (!content) return [];
        this.removeTags(content, 'script');
        this.removeTags(content, '#word-thumbnail-image');
        this.removeTags(content, '[style]');
        this.removeTags(content.parentNode, '#ExpFCChild>br');
        let anchor = content.querySelector('a');
        if (anchor) {
            let link = 'http://www.godic.net' + anchor.getAttribute('href');
            anchor.setAttribute('href', link);
            anchor.setAttribute('target', '_blank');
        }
        content.innerHTML = content.innerHTML.replace(/<p class="exp">(.+?)<\/p>/gi, '<span class="exp">$1</span>');
        content.innerHTML = content.innerHTML.replace(/<span class="exp"><br>/gi, '<span class="exp">');
        content.innerHTML = content.innerHTML.replace(/<span class="eg"><br>/gi, '<span class="eg">');
        sethint(content.innerHTML,expression);
        let css = this.renderCSS();
        notes.push({
            css,
            expression,
            reading,
            extrainfo,
            definitions: [content.innerHTML],
            audios
        });
        return notes;
    }

    renderCSS() {
        let css = `
            <style>
            span.eg,
            span.exp,
            span.cara
            {display:block;}
            .cara {color: #1C6FB8;font-weight: bold;}
            .eg {color: #238E68;}
            #phrase I {color: #009933;font-weight: bold;}
            span.cet  {margin: 0 3px;padding: 0 3px;font-weight: normal;font-size: 0.8em;color: white;background-color: #5cb85c;border-radius: 3px;}
            </style>`;

        return css;
    }
	
	function sethint(idVal,keyword) 
{ 
    var pucl = document.getElementById(idVal); 
    var temp=pucl.innerHTML; 
    var htmlReg = new RegExp("\<.*?\>","i"); 
    var arrA = new Array(); 
    //替换HTML标签 
    for(var i=0;true;i++) 
    { 
        var m=htmlReg.exec(temp); 
        if(m) 
        { 
            arrA[i]=m; 
        } 
        else 
        { 
            break; 
        } 
        temp=temp.replace(m,"{[("+i+")]}"); 
    } 
    //如果是字符串 转成数组
    if(typeof(keyword)=="string"){
        words = unescape(keyword.replace(/\+/g,' ')).split(/\s+/); 
    }else{
        words=keyword;
    }
    //替换关键字 
    for (w=0;w<words.length;w++) 
    { 
        var r = new RegExp("("+words[w].replace(/[(){}.+*?^$|\\\[\]]/g, "\\$&")+")","ig"); 
        temp = temp.replace(r,"<span class='text_blue'>$1</span>"); 
    } 
    //恢复HTML标签 
    for(var i=0;i<arrA.length;i++) 
    { 
        temp=temp.replace("{[("+i+")]}",arrA[i]); 
    } 
        pucl.innerHTML=temp; 
}
}
