export function defineModal():void {
  class AnimaModal extends HTMLElement {
    private events?: AbortController;
    private opener: HTMLElement | null = null;
    get dialog(): HTMLDialogElement | null { return this.querySelector('dialog'); }
    connectedCallback(): void {
      this.events?.abort();this.events=new AbortController();
      this.dialog?.addEventListener('close',()=>{if(this.opener?.isConnected)this.opener.focus();},{signal:this.events.signal});
      this.addEventListener('click',event=>{if((event.target as Element).closest('[data-modal-close]'))this.close();},{signal:this.events.signal});
    }
    open(opener: HTMLElement | null = document.activeElement as HTMLElement | null): void {this.opener=opener;this.dialog?.showModal();}
    close(): void {this.dialog?.close();}
    disconnectedCallback(): void {this.events?.abort();if(this.dialog?.open)this.dialog.close();}
  }
  if(!customElements.get('anima-modal'))customElements.define('anima-modal',AnimaModal);
}
