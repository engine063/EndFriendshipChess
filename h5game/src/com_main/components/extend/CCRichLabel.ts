module com_main {
	/**
	 *
	 * @author
	 *
	 */
    export  class RichTextEvent extends egret.Event {
        public static Link: string = "link";
        public text: string = "";
        public constructor(type: string, bubbles: boolean = false, cancelable: boolean = false, text?: string) {
            super(type, bubbles, cancelable);

            this.text = text;
        }
    }
    enum IRichElement { text, image };
    export  class CCRichLabelTextParser extends egret.HtmlTextParser {
        private m_pTexts: any[] = [];
        public constructor() {
            super();
        }

        private addToResults(text: string, type: IRichElement, objectText: any): void {
            if (objectText.style) {
                this.m_pTexts.push({ 'text': text, 'type': type, 'style': objectText.style });
            } else {
                this.m_pTexts.push({ 'text': text, 'type': type });
            }
        }

        private parseImage(objectText: any): void {
            var htmltext: string = objectText.text;
            var firstIdx: number = 0; //文本段开始位置
            var length: number = htmltext.length;

            while (firstIdx < length) {
                var starIdx: number = htmltext.indexOf("[img]", firstIdx);
                if (starIdx < 0) {
                    this.addToResults(htmltext.substring(firstIdx), IRichElement.text, objectText);
                    firstIdx = length;
                }
                else {
                    this.addToResults(htmltext.substring(firstIdx, starIdx), IRichElement.text, objectText);
                    var fontEnd: number = htmltext.indexOf("[/img]", starIdx);
                    if (fontEnd == -1) {
                        egret.$error(1038);
                        fontEnd = starIdx;
                    }
                    else {
                        this.addToResults(htmltext.substring(starIdx + 5, fontEnd), IRichElement.image, objectText);
                    }
                    firstIdx = fontEnd + 6;
                }
            }
        }

        public parser(htmltext: string): Array<egret.ITextElement> {
            this.m_pTexts = [];
            var result: any[] = super.parser(htmltext);

            for (var i: number = 0; i < result.length; i++) {
                this.parseImage(result[i]);
            }

            return this.m_pTexts;
        }

        public dispose(): void {
            this.m_pTexts.length = 0;
        }
    }
    export class CCRichLabel extends egret.DisplayObjectContainer {
        private m_pTextParser: CCRichLabelTextParser = new CCRichLabelTextParser();
        private m_pLineLabel: eui.Label = new eui.Label();
        private m_pLabels: any[] = [];
        private m_pLabelEvents: any[] = [];
        private m_pLine: number = 0;
        private m_pImages: any = {};
        public lineWidth: number = 300;
        private m_pWidth: number = 0;

        public lineSpacing: number = 0;
        public size: number = 0;
        public textColor: number;
        public bold: boolean;
        public stroke: number;
        public strokeColor: number = 0;
        public textWidth: number = 0;
        public textHeight: number = 0;
        public fontFamily: string = '';
        public isSubStr: boolean = false;
        public isSubEnd: boolean = false;
        public limitLines: number = 0;
        public imageScale:number = 1;

        public tempLabels:any[] =[];//lung17
        public tempImages:any[] =[];//lung17

        public constructor(defaultWidth?: number) {
            super();
            if (defaultWidth) {
                this.lineWidth = defaultWidth
            }
        }

        public get lineNum(){
            return this.numChildren;
        }

        private genSpaceStr(spaceWidth: number): any[] {
            var spaceStr: string = '';

            while (spaceWidth > 0) {
                spaceStr += ' ';
                spaceWidth -= this.size < 10 ? 4 : this.size / 3.3333;//空格的宽度
            }
            return [spaceStr, spaceWidth];
        }

        private showElement(textArr: egret.ITextElement[]): void{
            // sayError("textArr",textArr);

            var elements: egret.ITextElement[] = [];
            var arrLen = textArr.length;
            for (var i: number = 0; i < arrLen; i++) {
                var el: egret.ITextElement = textArr[i];
                if (el.text == '') continue;
                if (el['type'] == IRichElement.image) {
                    var bitmap: egret.Bitmap = new egret.Bitmap(RES.getRes(el.text));
                    bitmap.width = bitmap.width * this.imageScale;
                    bitmap.height = bitmap.height * this.imageScale;

                    var spaces: any[] = this.genSpaceStr(bitmap.width);
                    el['bitmap'] = bitmap;
                    el['offsetX'] = spaces[1];
                    el.text = spaces[0];
                    elements.push(el);

                }

                this.appendElement(el, arrLen - 1 == i);
                if (this.isSubStr && this.isSubEnd) {
                    return;
                }
            }
        }

        private createLineLabel(element: egret.ITextElement, newText: string): void {
            var newEl: any = {};
            if (element.style) {
                newEl = { 'text': newText, 'style': element.style };
            } else {
                newEl = { 'text': newText };
            }

            if (!this.m_pLabels[this.m_pLine]) {
                this.m_pLabels[this.m_pLine] = [];
            }
            this.m_pLabels[this.m_pLine].push(newEl);//存放分行后的对象数据，一个下标对象就是一个数组，这个数组中存放本行的对象
        }

        private createLineImage(element: egret.ITextElement, line: number, offsetX): void {
            if (!this.m_pImages[line]) {
                this.m_pImages[line] = { lineHeight: 0, list: [] };
            }
            element['x'] = offsetX;
            element['line'] = line;
            this.m_pImages[line]['list'].push(element);
            if (this.m_pImages[line]['lineHeight'] < element['bitmap']['height']) {
                this.m_pImages[line]['lineHeight'] = element['bitmap']['height'];
            }
        }

        private appendElement(element: egret.ITextElement, isEnd?): void {
            var startIndex: number = 0;
            var labelText: string = this.m_pLineLabel.text;
            var lineLabelWidth: number = this.m_pLineLabel.width;
            var bitmapWidth: number = element['bitmap'] ? element['bitmap']['width'] : 0;
            var text: string = element.text;
            var sub_text: string;

            var textArr: string[] = text.split('\n');
            var textArrlen: number = textArr.length;

            for (var idx: number = 0; idx < textArrlen; idx++) {
                text = textArr[idx];
                for (var i: number = 0; i <= text.length; i++) {
                    sub_text = text.substring(startIndex, i);

                    this.m_pLineLabel.text = labelText + sub_text;
                    // debug(this.m_pLineLabel.text);//lung17
                    var line_width =  this.m_pLineLabel.textWidth;
                    if (this.isSubStr && this.limitLines > 0 && element['type'] == IRichElement.image){
                        line_width += 10;
                    }

                    if ( line_width >= (this.lineWidth -10)) {
                        if (this.m_pLineLabel.width > this.lineWidth) {
                            sub_text = text.substring(startIndex, i - 1);
                            startIndex = i - 1;
                        } else {
                            startIndex = i;
                        }

                        if (this.isSubStr) {
                            if (this.limitLines > 0){
                                if (this.m_pLine == this.limitLines -1){
                                    sub_text = element['type'] == IRichElement.text ? sub_text + '...' : '...';
                                    this.isSubEnd = true;
                                }
                            }else{
                                if (element['type'] == IRichElement.text){
                                    sub_text += '...';
                                    this.isSubEnd = true;
                                }
                            }
                        }

                        this.createLineLabel(element, sub_text);
                        this.m_pLine += 1;

                        labelText = '';
                        this.m_pLineLabel.text = '';

                        if (element['type'] == IRichElement.image) {
                            if (this.m_pLineLabel.width - lineLabelWidth > bitmapWidth / 1.5) {
                                this.createLineImage(element, this.m_pLine - 1, lineLabelWidth + bitmapWidth);
                            } else {
                                if (this.isSubStr){
                                    return;
                                }
                                this.m_pLineLabel.text = element.text;
                                this.createLineImage(element, this.m_pLine, bitmapWidth);
                                this.createLineLabel(element, labelText);
                            }
                            return;
                        }

                    }
                }
                if (textArrlen > 1 && idx < textArrlen - 1) {
                    this.createLineLabel(element, sub_text);
                    this.m_pLine += 1;
                    labelText = '';
                    this.m_pLineLabel.text = '';
                }
            }

            if (element['type'] == IRichElement.image) {
                this.createLineImage(element, this.m_pLine, this.m_pLineLabel.width);
            }
            sub_text = text.substring(startIndex);
            if (sub_text) {
                this.createLineLabel(element, sub_text);
            }
        }

        private _textFlow(text: string): void {
            this.m_pImages = [];

            //解析html文本字符串。
            var textArr = this.m_pTextParser.parser(text);

            this.showElement(textArr);
            this.displayLables();
            egret.callLater(function () {
                this.displayImages();
                // this.adjustVerticalHeight();
            }, this);

            

        }

        //调整label换行后纵向高度和位置  lung17
        private adjustVerticalHeight():void
        {
            for (var i=0;i<this.tempLabels.length;i++)
            {
                var oneLineObj = this.tempLabels[i];

            }
            for (var i=0;i<this.tempImages.length;i++)
            {
                var oneLineObj = this.tempImages[i];
                debug("adjustVerticalHeight2 height:%d ,lineH:%d,offsetY:%d,lineIndex:%d"
                    ,oneLineObj["imageObj"].height,oneLineObj["lineH"],oneLineObj["offsetY"],oneLineObj["lineIndex"]);
            }
            debug("textWidth:%d,textHeight:%d",this.textWidth,this.textHeight)

            if (this.tempLabels.length==0) return ;
            //第一行不做处理，第二行开始。当前行和上一行的间距进行调整
            var afterHeight:number = 0;//最后用它来计算 height
            for(var i=1;i<this.tempLabels.length;i++)
            {
                //文字 label 行间距
                var nCurLineHeight:number = this.tempLabels[i].height;
                var nPreLineHeight:number = this.tempLabels[i-1].height;
                var nH:number = nCurLineHeight+nPreLineHeight;
                var sss:number = this.size*2;
                if (nH<=sss) continue; //这种情况就不需要调整了
                afterHeight = afterHeight + nCurLineHeight;//累加高度值
                //一行中的 image 的大小
                var oneLineImages:any[]=[];
                for (var j=0;j<this.tempImages.length;j++)
                {   //把同一行的先筛选出来
                    if (this.tempImages[j]["lineIndex"]=i)
                    {
                        oneLineImages.push(this.tempImages[j]);                        
                    }
                }
                
                //开始调整
                this.tempLabels[i].y = this.tempLabels[i].y + (nH-sss);//调整label
                for(var n=0;n<oneLineImages.length;i++)
                    oneLineImages[n]["imageObj"].y = oneLineImages[n]["imageObj"].y+ (nH-sss); //调整image

                oneLineImages =[];
                // debug();
            }

            afterHeight = afterHeight+this.tempLabels[0].height;
            if (afterHeight>this.textHeight)
                this.textHeight =afterHeight;//最后要设置调整后的高度值

            this.tempLabels = [];
            this.tempImages = [];   
        }

        private linkClick(evt: egret.TextEvent): void {
            this.dispatchEvent(new RichTextEvent(RichTextEvent.Link, true, false, evt.text));
        }

        private displayLables(): void {
            // sayError("this.m_pLabels",this.m_pLabels);
            var offsetY: number = 0;
            var length: number = this.m_pLabels.length;//分行后的label。 lung17
            for (var line: number = 0; line < length; line++) {
                 if (this.limitLines && line >= this.limitLines) {
                     break;
                 }
                var label: eui.Label = this.createLabel();
                var imageHeight: number = this.m_pImages[line] ? this.m_pImages[line]['lineHeight'] : this.size;
                // debug("imageHeight:"+imageHeight);//lung17
                var lineLabels: any[] = this.m_pLabels[line];//把一行中的N个label对象集合 lung17
                if (!lineLabels) continue;
                for (var i: number = 0; i < lineLabels.length; i++) {
                    var element: any = lineLabels[i];//把一行中的N个label 分别拆出来。 lung17

                    label.appendElement(element);//把N个label 对象整合 成一个label lung17

                    if (element.style && element.style.href) {
                        label.addEventListener(egret.TextEvent.LINK, this.linkClick, this);
                        this.m_pLabelEvents.push({ label: label, type: egret.TextEvent.LINK });
                    }
                }
                offsetY += imageHeight > this.size ? (imageHeight - this.size) / 2 : 0;
                label.y = line * (this.size + this.lineSpacing);
                this.tempLabels.push(label);//lung17
                this.addChild(label);
                if (this.textWidth < label.textWidth) this.textWidth = label.textWidth;
            }

            this.textHeight = length * (this.size + this.lineSpacing) + offsetY - this.lineSpacing;
            this.m_pLabels = [];
            // debug("this.textHeight:"+ this.textHeight);//lung17
            // debug("displayLables:",this.m_pLabels,length,this.textHeight);

        }

        private displayImages(): void {
            var offsetY: number = 0;
            // sayError("this.m_pImages",this.m_pImages);
            for (var line in this.m_pImages) {
                if (this.limitLines && Number(line) >= this.limitLines) {
                    break;
                }
                var images: any[] = this.m_pImages[line]['list'];
                var imageHeight: number = this.m_pImages[line]['lineHeight'];
                offsetY += imageHeight > this.size ? (imageHeight - this.size) / 2 : 0;
                for (var i: number = 0; i < images.length; i++) {
                    var image: any = images[i];
                    var height: number = this.size;
                    var x: number = image.x;
                    var y: number = (height + this.lineSpacing) * image.line;
                    if (!this.getChildByName(image.bitmap.hashCode)) {
                        this.tempImages.push({"imageObj":image.bitmap,"lineIndex":line,
                            "lineH":imageHeight,"offsetY":offsetY});//lung17  this.m_pImages[line],line表示在label中的第几行。从0开始
                        this.addChild(image.bitmap);
                        image.bitmap.name = image.bitmap.hashCode
                    }
                    image.bitmap.x = x - image.bitmap.width;
                    image.bitmap.y = y + this.size - image.bitmap.height + offsetY;
                    //                    debug("displayImages:",image.line,offsetY,y,image.bitmap.height,offsetY,image.bitmap.y);
                }
            }
            this.m_pImages = {};
        }

        private createLabel(): eui.Label {
            var label: eui.Label = new eui.Label();
            label.textColor = this.textColor;
            label.size = this.size;
            label.bold = this.bold;
            label.stroke = this.stroke;
            label.strokeColor = this.strokeColor;
            label.fontFamily = this.fontFamily;

            return label;
        }

        private setLineLabelStyle(): void {
            this.m_pLineLabel.size = this.size;
            this.m_pLineLabel.bold = this.bold;
            this.m_pLineLabel.stroke = this.stroke;
            this.m_pLineLabel.strokeColor = this.strokeColor;
            this.m_pLineLabel.fontFamily = this.fontFamily;
        }

        public setStyle(lblStyle: eui.Label): void {
            this.textColor = lblStyle.textColor;
            this.size = lblStyle.size;
            this.lineSpacing = lblStyle.lineSpacing;
            this.bold = lblStyle.bold;
            this.stroke = lblStyle.stroke;
            this.strokeColor = lblStyle.strokeColor;
            this.fontFamily = lblStyle.fontFamily;
        }

        public setText(text: string, width?: number): void {
            this.setLineLabelStyle();
            this.textWidth = 0;
            this.textHeight = 0;
            this.isSubEnd = false;
            this.m_pLabels = [];
            this.removeLabelEvent();
            this.m_pLineLabel.text = "";
            this.removeChildren();
            this.m_pLine = 0;
            this.m_pImages = {};
            this._textFlow(text);
            this.width = width ? width : this.lineWidth;
        }

        private removeLabelEvent(): void {
            var event: any, i: number;
            for (i = 0; i < this.m_pLabelEvents.length; i++) {
                event = this.m_pLabelEvents[i];
                event['label'].removeEventListener(event['type'], this.linkClick, this);
            }
            this.m_pLabelEvents.length = 0;
        }

        public dispose(): void {
            this.removeLabelEvent();
            this.m_pImages.length = 0;
            this.m_pLabels.length = 0;
            this.m_pTextParser.dispose();
            this.m_pTextParser = null;
        }
    }

    export class CCRichText extends CComponent {
        private label: CCRichLabel;
        private m_pWidth: number;
        private m_pHeight: number;
        private m_pIsCenter: boolean = false;
        private m_pX: number = 0;
        private m_pY: number = 0;
        private m_pOldText: string = "";

        public constructor(label: eui.Label) {
            super();
            this.horizontalCenter = label.horizontalCenter;
            this.verticalCenter = label.verticalCenter;

            this.top = label.top;
            this.bottom = label.bottom;
            this.left = label.left;
            this.right = label.right;

            this.label = new CCRichLabel(label.width);
            this.setStyle(label);
            this.addChild(this.label);

            label.visible = false;
        }

        $onRemoveFromStage(): void {
            this.label.dispose();
            this.label = null;
            this.m_pOldText = null;
            super.$onRemoveFromStage();
        }

        public setStyle(lblStyle: eui.Label): void {
            this.m_pWidth = lblStyle.width;
            this.m_pHeight = lblStyle.height;
            this.m_pX = lblStyle.x;
            this.m_pY = lblStyle.y;

            this.label.setStyle(lblStyle);
            this.setPosition(lblStyle.x, lblStyle.y);
        }

        public set textAlign(center: boolean) {
            this.m_pIsCenter = center;
            this.setPosition(this.m_pX, this.m_pY);
        }

        public set subText(text: string) {
            this.label.isSubStr = true;
            this.text = text;
        }

        public get lineNum(){
            return this.label.lineNum;
        }

        public set text(text: string) {
            text = this.parseLanRich(text);
            text = this.parseClickRich(text);
            if (this.m_pOldText != text) {
                this.label.setText(text);

                this.width = this.label.textWidth;
                this.height = this.label.textHeight;

                this.setPosition(this.m_pX, this.m_pY);
                this.m_pOldText = text;
            }
        }

        public setText(text: string,width:number) {
            this.label.lineWidth = width;
            this.text = text;
        }
        public setLabelLineWidth(width:number)
        {
            this.label.lineWidth = width
        }

        public set imageScale(scale){
            this.label.imageScale = scale;
        }

        public get textWidth(): number {
            return this.label.textWidth;
        }

        public get textHeight(): number {
            return this.label.textHeight;
        }

        public set textColor(color) {
            this.label.textColor = color;
        }

        public setWidth(width: number): void {
            this.m_pWidth = width;
        }

        public setPosition(x: number, y: number): void {
            if (this.m_pIsCenter) {
                var centerX: number = x + this.m_pWidth / 2;
                var centerY: number = y + this.m_pHeight / 2;
                this.x = centerX - this.label.textWidth / 2;
                this.y = centerY - this.label.height / 2;
            } else {
                this.x = x;
                this.y = y;
            }
        }

        //限制文字行数 超过不显示 可能导致subText有问题
        public limitHeight(numLine) {
            this.label.limitLines = numLine;
        }


        //lung17

        /**
         * 解析语言包的富文本
         */
        public parseLanRich(str) {
            var patt1 = new RegExp("(.*)<color=(.*?)>(.*?)<\/color>(.*)");
            var dstText = "";
            var result = null;
            do {
                result = patt1.exec(str);
                if (result) {
                    var color = RegExp.$2;
                    if (color.indexOf("#") == -1) {
                        color = "#" + color.substr(0, 6);
                    } else {
                        color = color.substr(0, 7);
                    }
                    var newStr = RegExp.$1 + "<font color='" + color + "'>" + RegExp.$3 + "</font>" + RegExp.$4;
                    str = newStr;
                }
            } while (result != null);

            return str;
        }

        /**
         * 解析语言包的富文本
         */
        public parseClickRich(str) {
            var patt1 = new RegExp("(.*)<clk=(.*?)>(.*?)<\/clk>(.*)");
            var dstText = "";
            var result = null;
            do {
                result = patt1.exec(str);
                if (result) {
                    var event = RegExp.$2;
                    var newStr = RegExp.$1 + "<u><a href='event:" + event + "'>" + RegExp.$3 + "</a></u>" + RegExp.$4;
                    str = newStr;
                }
            } while (result != null);

            return str;
        }



    }
}
