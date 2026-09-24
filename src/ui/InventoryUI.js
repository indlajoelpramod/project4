/**
 * InventoryUI — displays collected clues and items in a full-screen overlay.
 * Toggled via the Tab key.
 */
export class InventoryUI {
  constructor(inventory) {
    this.inventory = inventory;
    this.container = document.getElementById('inventory-screen');
    this.grid = document.getElementById('inventory-grid');
    this.detailsPanel = document.getElementById('inventory-details');
    this.isOpen = false;
  }

  toggle() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.refresh();
      this.container.classList.remove('hidden');
    } else {
      this.container.classList.add('hidden');
    }
    return this.isOpen;
  }

  hide() {
    this.isOpen = false;
    this.container.classList.add('hidden');
  }

  refresh() {
    this.grid.innerHTML = '';
    const clues = this.inventory.getClues();

    if (clues.length === 0) {
      this.grid.innerHTML = '<div class="inventory-empty">No items collected.</div>';
      this.detailsPanel.innerHTML = '<p>Select an item to view details.</p>';
      return;
    }

    clues.forEach(clue => {
      const slot = document.createElement('div');
      slot.className = 'inventory-slot';
      slot.innerHTML = `<span class="inventory-icon">${clue.icon}</span>`;
      
      slot.addEventListener('click', () => {
        // Highlight selected slot
        document.querySelectorAll('.inventory-slot').forEach(el => el.classList.remove('selected'));
        slot.classList.add('selected');
        
        // Show details
        this.detailsPanel.innerHTML = `
          <h3>${clue.name}</h3>
          <span class="inventory-type">${clue.type.toUpperCase()}</span>
          <p>${clue.description}</p>
        `;
      });
      
      this.grid.appendChild(slot);
    });
    
    // Auto-select first item
    if (this.grid.firstChild && this.grid.firstChild.classList.contains('inventory-slot')) {
      this.grid.firstChild.click();
    }
  }
}
