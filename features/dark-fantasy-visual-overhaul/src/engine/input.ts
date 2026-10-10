export class InputManager {
  keys: Set<string> = new Set();
  mouseX: number = 0;
  mouseY: number = 0;
  mouseClicked: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e) => this.keys.add(e.key.toLowerCase()));
      window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
      window.addEventListener('mousemove', (e) => {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
      });
      window.addEventListener('mousedown', () => { this.mouseClicked = true; });
    }
  }

  isDown(key: string): boolean {
    return this.keys.has(key.toLowerCase());
  }

  consumeClick(): boolean {
    if (this.mouseClicked) {
      this.mouseClicked = false;
      return true;
    }
    return false;
  }
}
