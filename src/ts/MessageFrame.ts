export type ConfirmationPaneParameter = {
    text:string;
    bttnOk?:string;
    bttnCancel?:string;
    className?:string
}

export class MessageFrame {

    static instance:MessageFrame
	
    title:string;
    active:boolean=false;

    initialX:number;
    initialY:number;

    dragFct:EventListenerOrEventListenerObject;
    dragEndFct:EventListenerOrEventListenerObject;
    fctClose:EventListenerOrEventListenerObject;

    dom:HTMLDivElement;
    top:HTMLDivElement;
    closeBttn:HTMLAnchorElement;

    dragEnded:boolean;

    cancelConfirmBttn: HTMLButtonElement;
    okConfirmBttn: HTMLButtonElement;
    innerpane: HTMLDivElement;

    show(content:Node, title:string, className:string) {

        this.hide();

        this.title = title;

        this.dom = document.createElement("div");
        this.dom.className=className;
        this.dom.id = "msgFrame";
		this.top = document.createElement("div");

		this.closeBttn=document.createElement("a");
		// this.closeBttn.innerHTML = '<i id="frame_content_toggle_button" class="fa fa-minus-square-o" aria-hidden="true" style="float: right; margin: 3px 3px 2px 7px; color: black;"></i>';
        this.closeBttn.innerHTML = '<span>'+String.fromCharCode(0x274C)+'</span>';
        this.closeBttn.className = "msgframe_closebttn";
        var spanTitle = document.createElement("span");
        
		spanTitle.className="fett";
		spanTitle.innerText=title;
		this.top.appendChild(this.closeBttn);
		// this.top.appendChild(spanTitle);
		this.dom.appendChild(this.top);
		this.dom.appendChild(content);
	
		this.fctClose = this.close.bind(this);
		this.closeBttn.addEventListener("click", this.fctClose);

		this.dom.addEventListener("touchstart", this.dragStart.bind(this));
		this.dom.addEventListener("touchend", this.dragEnd.bind(this));

		this.dom.addEventListener("mousedown", this.dragStart.bind(this), false);
		this.dom.addEventListener("mouseup", this.dragEnd.bind(this));
        
        /*
		if (window.localStorage) {				
			var x = window.localStorage.getItem('frame_x_'+title);
			var y = window.localStorage.getItem('frame_y_'+title);
			if (x && y) {
				this.dom.style.left=x+"px";
				this.dom.style.top=y+"px";
			}
        } 
        */  
        document.body.appendChild(this.dom);     
    
        let h = this.dom.clientHeight;
        let w = this.dom.clientWidth;
        this.dom.style.left = (document.body.clientWidth/2 - w/2)+"px";
        this.dom.style.top = (document.body.clientHeight/2 - h/2)+"px";
 
    }


    confirm(resolve: (value?: boolean) => void, reject: (reason?: any) => void, param:ConfirmationPaneParameter) {
        // console.info("kjdolsdjöla", this.dom, this);
        this.hide();

        const d = createDiv(param.text);

        this.dom = document.createElement("div");
        this.dom.className= param.className ? "confirm-dialog-outer " + param.className : "confirm-dialog-outer";
        this.dom.id = "msgFrame";

        const innerPane = document.createElement("div");
        innerPane.className= param.className ? "confirm-dialog " + param.className : "confirm-dialog";

		this.cancelConfirmBttn=document.createElement("button");
        this.cancelConfirmBttn.innerHTML = param.bttnCancel ? param.bttnCancel : 'abbrechen';      
        this.cancelConfirmBttn.addEventListener("click", (evt:MouseEvent) => {
            // console.info("cancelConfirmBttn => false");
            this.hide();
            resolve(false)}
        );

        this.okConfirmBttn=document.createElement("button");
        this.okConfirmBttn.innerHTML = param.bttnOk ? param.bttnOk : 'ok';   
        this.okConfirmBttn.addEventListener("click", (evt:MouseEvent) => {
            // console.info("okConfirmBttn ok");
            this.hide();
            resolve(true)
        });

        innerPane.appendChild(d);
        innerPane.appendChild(this.cancelConfirmBttn);
        innerPane.appendChild(this.okConfirmBttn);
    
        const fnDragStart = (ev:TouchEvent|MouseEvent) => this.dragStart(ev)
        const fnDragEnd   = (ev:TouchEvent|MouseEvent) => this.dragEnd(ev)
        
		innerPane.addEventListener("touchstart", fnDragStart);
		innerPane.addEventListener("touchend", fnDragEnd);

		innerPane.addEventListener("mousedown", fnDragStart, false);
		innerPane.addEventListener("mouseup", fnDragEnd);
  
        this.dom.appendChild(innerPane);
        this.innerpane = innerPane;
        document.body.appendChild(this.dom);     
    
        /*
        let h = innerPane.clientHeight;
        let w = innerPane.clientWidth;
        innerPane.style.left = (document.body.clientWidth/2 - w/2)+"px";
        innerPane.style.top = (document.body.clientHeight/2 - h/2)+"px";
        */
    }
   
    /*
    cancled(evt: MouseEvent): any {
        throw new Error("Method not implemented.");
    }
    confirmed(evt: MouseEvent): any {
        throw new Error("Method not implemented.");
    }
    */

    hide() {
		if (this.dom) {
            document.body.removeChild(this.dom);
            this.dom = null;
        }
	}

    dragStart(e:MouseEvent | TouchEvent) {		   
        // console.info("dragstart ", this.innerpane);
        const innerPane = this.dom;
        if (e.type === "touchstart") {
            let te = <TouchEvent>e;
            this.initialX = te.touches[0].clientX-innerPane.offsetLeft;
            this.initialY = te.touches[0].clientY-innerPane.offsetTop;
        } else {
            let me = <MouseEvent>e;
            this.initialX = me.clientX-innerPane.offsetLeft;
            this.initialY = me.clientY-innerPane.offsetTop;
        }
        this.active = true;

        this.dragFct = this.drag.bind(this);
        this.dom.addEventListener("mousemove", this.dragFct);
        this.dom.addEventListener("touchmove", this.dragFct);
        this.dragEndFct = this.dragEnd.bind(this);
        this.dom.addEventListener("mouseleave", this.dragEndFct);		
    }
    dragEnd(e:UIEvent) {        
		if (this.active) {
			this.active = false;
			this.dom.removeEventListener("mousemove", this.dragFct);
			this.dom.removeEventListener("touchmove", this.dragFct);
			this.dom.removeEventListener("mouseleave", this.dragEndFct);
			this.dragFct=null;
			this.dragEndFct=null;
			this.dragEnded=true;
		}
    }
    drag(e:MouseEvent | TouchEvent) {
        // console.info("drag")
        if (this.active) {
            let clientX:number;
            let clientY:number;
            if (e.type === "touchmove") {
                let te = <TouchEvent>e;
                clientX = te.touches[0].clientX - this.initialX;
                clientY = te.touches[0].clientY - this.initialY;
            } else {
                e.preventDefault();
                let me = <MouseEvent>e;
                clientX = me.clientX - this.initialX;
                clientY = me.clientY - this.initialY;
            }
            if (clientX<0) {
                clientX=0;
            }
            if (clientY<0) {
                clientY=0;
            }
            if (clientX+this.innerpane.offsetWidth>this.dom.offsetWidth) {
                clientX=this.dom.offsetWidth-this.innerpane.offsetWidth;
            }
            if (clientY+this.innerpane.offsetHeight>this.dom.offsetHeight) {
                clientY=this.dom.offsetHeight-this.innerpane.offsetHeight;
            }
            this.innerpane.style.left=clientX+"px";
            this.innerpane.style.top=clientY+"px";
            /*
			if (window.localStorage) {				
				window.localStorage.setItem('frame_x_'+this.title, clientX.toString());
				window.localStorage.setItem('frame_y_'+this.title, clientY.toString());
            }
            */
        }

    }

    
	close() {
		this.closeBttn.removeEventListener("click", this.fctClose);
        this.dom.remove();
        this.dom = null;
    }
    
}

export function showMessage(text:string) {
    let d = createDiv(text);
	if (!MessageFrame.instance) {
		MessageFrame.instance = new MessageFrame();
	}
	MessageFrame.instance.show(d, "Info", 'msgframe');
}

export function createDiv(params:string) {
    let div = document.createElement("div");
    div.innerText=params;
    return div;
}

export function showConfirmationPane(param:ConfirmationPaneParameter):Promise<boolean> {
    
	if (!MessageFrame.instance) {
		MessageFrame.instance = new MessageFrame();
    }
    return new Promise<boolean>(
        function(resolve, confirm) {
            MessageFrame.instance.confirm(resolve, confirm, param);
        }
    )
}




