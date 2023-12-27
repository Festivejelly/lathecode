import { LatheCode } from '../common/lathecode';
import { Sender } from './sender';
import { Move } from '../common/move';
import { createGCode } from './gcodeutils';

export class GCode {
  private runTextarea: HTMLTextAreaElement;
  private sendButton: HTMLButtonElement;
  private stopButton: HTMLButtonElement;
  private whatLink: HTMLAnchorElement;
  private senderError: HTMLDivElement;
  private runProgress: HTMLProgressElement;
  private saveGCodeNameInput: HTMLInputElement;
  private loadSelect: HTMLSelectElement;
  private loadButton: HTMLButtonElement;
  private saveButton: HTMLButtonElement;
  private deleteButton: HTMLButtonElement;
  private sender: Sender | null = null;

  constructor(private container: HTMLElement) {
    container.style.display = 'block';

    this.runTextarea = container.getElementsByTagName('textarea')[0];
    this.senderError = container.querySelector<HTMLDivElement>('.senderError')!;
    this.runProgress = container.getElementsByTagName('progress')[0];

    this.sendButton = container.querySelector<HTMLButtonElement>('.sendButton')!;
    this.sendButton.addEventListener('click', () => {
      if (!this.sender) this.sender = new Sender(() => this.senderStatusChange());
      this.sender.start(this.runTextarea!.value);
    });

    this.stopButton = container.querySelector<HTMLButtonElement>('.stopButton')!;
    this.stopButton.addEventListener('click', () => this.sender!.stop());
    this.stopButton.style.display = 'none';

    this.whatLink = container.querySelector<HTMLAnchorElement>('.whatLink')!;

    this.saveGCodeNameInput = container.querySelector<HTMLInputElement>('.saveGCodeNameInput')!;
    this.loadSelect = container.querySelector<HTMLSelectElement>('.loadGCodeSelect')!;
    this.loadButton = container.querySelector<HTMLButtonElement>('.loadGCodeButton')!;
    this.saveButton = container.querySelector<HTMLButtonElement>('.saveGCodeButton')!;
    this.deleteButton = container.querySelector<HTMLButtonElement>('.deleteGCodeButton')!;

    //event listeners
    this.saveButton.addEventListener('click', () => this.saveGCode());
    this.loadButton.addEventListener('click', () => this.loadGCode());
    this.deleteButton.addEventListener('click', () => this.deleteGCode());

    this.updateLoadSelect();
  }

  hide() {
    //this.container.style.display = 'none';
  }

  show(latheCode: LatheCode, moves: Move[]) {
    this.runTextarea.value = createGCode(latheCode, moves);
    this.container.style.display = 'block';
    this.runTextarea.scrollIntoView({ behavior: "smooth" });
  }

  saveGCode() {
    const saveName = this.saveGCodeNameInput.value.trim();
    if (!saveName) return; // Handle empty name case
    const prefixedName = `gCode-${saveName}`;
    localStorage.setItem(prefixedName, this.runTextarea.value);
    this.updateLoadSelect(prefixedName);

    this.saveGCodeNameInput.value = '';
  }

  loadGCode() {
    const selectedName = this.loadSelect.value;
    const gCode = localStorage.getItem(selectedName);
    if (gCode) {
      this.runTextarea.value = gCode;
    }
  }

  deleteGCode() {
    const selectedName = this.loadSelect.value;
    localStorage.removeItem(selectedName);
    this.updateLoadSelect();
  }

  updateLoadSelect(selectedName?: string) {
    this.loadSelect.innerHTML = '';

    let hasSavedItems = false;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      // Exclude 'latheCode' from the dropdown options
      if (key && key !== 'latheCode' && key.startsWith('gCode-')) {
        hasSavedItems = true;
        const option = document.createElement('option');
        const displayName = key.replace('gCode-', '');
        option.value = key;
        option.textContent = displayName;
        this.loadSelect.appendChild(option);

        if (key === selectedName) {
          option.selected = true;
        }
      }
    }

    // If no saved items, add a placeholder
    if (!hasSavedItems) {
      const placeholderOption = document.createElement('option');
      placeholderOption.textContent = 'No items saved';
      placeholderOption.disabled = true; // Make it non-selectable
      this.loadSelect.appendChild(placeholderOption);
    } else {
      // Sort the keys alphabetically if there are saved items
      const sortedOptions = Array.from(this.loadSelect.options)
        .sort((a, b) => a.text.localeCompare(b.text));

      this.loadSelect.innerHTML = '';
      sortedOptions.forEach(option => {
        this.loadSelect.appendChild(option);
      });
    }
  }

  private senderStatusChange() {
    if (!this.sender) return;
    const status = this.sender.getStatus();
    const isRun = status.condition === 'run';
    if (this.runProgress) {
      this.runProgress.value = status.progress;
      this.runProgress.style.display = isRun ? 'block' : 'none';
    }
    if (status.condition !== 'disconnected' && this.whatLink.parentNode) {
      this.whatLink.remove();
    }
    if (this.stopButton) this.stopButton.style.display = isRun ? 'inline-block' : 'none';
    if (this.sendButton) this.sendButton.style.display = isRun ? 'none' : 'inline-block';
    if (this.senderError) {
      this.senderError.style.display = status.error ? 'block' : 'none';
      this.senderError.innerText = status.error || '';
    }
  }
}
