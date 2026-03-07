// ============================================================
//  Winkeltje - Renderer (Canvas Drawing)
// ============================================================

const Renderer = (() => {
    let canvas, ctx;
    let frameCount = 0;

    function init(canvasEl) {
        canvas = canvasEl;
        ctx = canvas.getContext('2d');
    }

    // --- Floor ---
    function drawFloor() {
        // Warm wooden floor
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#D4A574');
        gradient.addColorStop(1, '#C49464');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Planks
        ctx.strokeStyle = 'rgba(139, 90, 43, 0.15)';
        ctx.lineWidth = 1;
        for (let y = 0; y < canvas.height; y += 30) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
            // Offset vertical lines per row
            const offset = (Math.floor(y / 30) % 2) * 40;
            for (let x = offset; x < canvas.width; x += 80) {
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x, y + 30);
                ctx.stroke();
            }
        }

        // Subtle wood grain noise
        ctx.fillStyle = 'rgba(139, 90, 43, 0.03)';
        for (let i = 0; i < 60; i++) {
            const wx = (i * 137) % canvas.width;
            const wy = (i * 191) % canvas.height;
            ctx.fillRect(wx, wy, 20 + (i % 30), 1);
        }
    }

    // --- Walls ---
    function drawWalls() {
        // Back wall
        const wallGrad = ctx.createLinearGradient(0, 0, 0, 55);
        wallGrad.addColorStop(0, '#E8DCC8');
        wallGrad.addColorStop(1, '#D5C4A8');
        ctx.fillStyle = wallGrad;
        ctx.fillRect(0, 0, canvas.width, 55);

        // Wall trim
        ctx.fillStyle = '#8B6914';
        ctx.fillRect(0, 52, canvas.width, 4);

        // Decorative tiles above shelves
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        for (let x = 20; x < canvas.width - 20; x += 50) {
            ctx.fillRect(x, 10, 40, 35);
            ctx.strokeStyle = 'rgba(139, 105, 20, 0.2)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, 10, 40, 35);
        }
    }

    // --- Shelf ---
    function drawShelf(shelf) {
        const { x, y, product } = shelf;
        const prod = PRODUCTS[product];
        const w = 100, h = 55;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        roundRect(ctx, x - 2, y + 4, w + 4, h + 2, 6, true, false);

        // Shelf body (wood)
        const shelfGrad = ctx.createLinearGradient(x, y, x, y + h);
        shelfGrad.addColorStop(0, '#A0724A');
        shelfGrad.addColorStop(0.5, '#8B5E3C');
        shelfGrad.addColorStop(1, '#7A4F30');
        ctx.fillStyle = shelfGrad;
        roundRect(ctx, x, y, w, h, 6, true, false);

        // Shelf top (lighter)
        ctx.fillStyle = '#B8885A';
        roundRect(ctx, x, y, w, 8, { tl: 6, tr: 6, bl: 0, br: 0 }, true, false);

        // Border
        ctx.strokeStyle = 'rgba(90, 50, 20, 0.4)';
        ctx.lineWidth = 1.5;
        roundRect(ctx, x, y, w, h, 6, false, true);

        // Product emoji (big)
        ctx.font = '32px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(prod.emoji, x + w / 2, y + h / 2 + 4);

        // Price tag
        const tagW = 40, tagH = 18;
        const tagX = x + w / 2 - tagW / 2;
        const tagY = y - 14;
        ctx.fillStyle = '#fff';
        roundRect(ctx, tagX, tagY, tagW, tagH, 4, true, false);
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        roundRect(ctx, tagX, tagY, tagW, tagH, 4, false, true);
        ctx.fillStyle = '#333';
        ctx.font = 'bold 11px "Segoe UI", sans-serif';
        ctx.fillText(`\u20AC${prod.price}`, x + w / 2, tagY + tagH / 2);

        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }

    // --- Cash Register ---
    function drawCashRegister(reg) {
        const { x, y } = reg;
        const w = 70, h = 50;

        // Counter surface
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        roundRect(ctx, x - 4, y + 4, w + 8, h + 2, 8, true, false);

        const cGrad = ctx.createLinearGradient(x, y, x, y + h);
        cGrad.addColorStop(0, '#78909C');
        cGrad.addColorStop(1, '#546E7A');
        ctx.fillStyle = cGrad;
        roundRect(ctx, x, y, w, h, 8, true, false);

        // Register top
        ctx.fillStyle = '#90A4AE';
        roundRect(ctx, x + 5, y + 5, w - 10, 15, 4, true, false);

        // Screen
        ctx.fillStyle = '#C8E6C9';
        roundRect(ctx, x + 10, y + 7, w - 20, 10, 2, true, false);

        // Buttons
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = '#ECEFF1';
            ctx.beginPath();
            ctx.arc(x + 20 + i * 15, y + 32, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Label
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('KASSA', x + w / 2, y + h - 5);
        ctx.textAlign = 'left';

        // Border
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1.5;
        roundRect(ctx, x, y, w, h, 8, false, true);
    }

    // --- Trash Can ---
    function drawTrashCan(trash) {
        const { x, y } = trash;
        const w = 36, h = 40;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h + 2, w / 2 - 2, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Can body
        const tGrad = ctx.createLinearGradient(x, y, x + w, y);
        tGrad.addColorStop(0, '#607D8B');
        tGrad.addColorStop(0.5, '#78909C');
        tGrad.addColorStop(1, '#607D8B');
        ctx.fillStyle = tGrad;
        ctx.beginPath();
        ctx.moveTo(x + 4, y + 8);
        ctx.lineTo(x + 2, y + h);
        ctx.lineTo(x + w - 2, y + h);
        ctx.lineTo(x + w - 4, y + 8);
        ctx.closePath();
        ctx.fill();

        // Lid
        ctx.fillStyle = '#546E7A';
        roundRect(ctx, x - 2, y, w + 4, 10, 3, true, false);

        // Handle
        ctx.strokeStyle = '#455A64';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + w / 2, y - 2, 6, Math.PI, 0);
        ctx.stroke();

        // Lines on can
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 1;
        for (let i = 1; i <= 2; i++) {
            const lx = x + (w / 3) * i;
            ctx.beginPath();
            ctx.moveTo(lx, y + 12);
            ctx.lineTo(lx - 1, y + h - 4);
            ctx.stroke();
        }
    }

    // --- Player ---
    function drawPlayer(player) {
        const { x, y, direction } = player;
        const size = 28;
        const cx = x + size / 2;
        const cy = y + size / 2;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + size / 2 + 2, size / 2 - 2, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body (green apron)
        ctx.fillStyle = '#43A047';
        ctx.beginPath();
        ctx.arc(cx, cy + 4, size / 2 - 2, 0, Math.PI * 2);
        ctx.fill();

        // Apron
        ctx.fillStyle = '#66BB6A';
        ctx.beginPath();
        ctx.moveTo(cx - 8, cy);
        ctx.lineTo(cx + 8, cy);
        ctx.lineTo(cx + 6, cy + 12);
        ctx.lineTo(cx - 6, cy + 12);
        ctx.closePath();
        ctx.fill();

        // Head
        ctx.fillStyle = '#FFCC80';
        ctx.beginPath();
        ctx.arc(cx, cy - 6, 9, 0, Math.PI * 2);
        ctx.fill();

        // Hair
        ctx.fillStyle = '#5D4037';
        ctx.beginPath();
        ctx.arc(cx, cy - 10, 8, Math.PI, 0);
        ctx.fill();

        // Eyes (direction-aware)
        const eyeOffX = direction === 'left' ? -2 : direction === 'right' ? 2 : 0;
        const eyeOffY = direction === 'up' ? -1 : direction === 'down' ? 1 : 0;
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(cx - 3 + eyeOffX, cy - 7 + eyeOffY, 1.5, 0, Math.PI * 2);
        ctx.arc(cx + 3 + eyeOffX, cy - 7 + eyeOffY, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Smile (only when not moving down/away)
        if (direction !== 'up') {
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(cx + eyeOffX, cy - 4, 3, 0.1, Math.PI - 0.1);
            ctx.stroke();
        }

        // Items above head
        drawCarriedItems(player);
    }

    function drawCarriedItems(player) {
        const items = player.carrying;
        if (items.length === 0) return;

        const cx = player.x + 14;
        let startY = player.y - 14;

        // Stacking background bubble
        const bubbleH = items.length * 14 + 6;
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        roundRect(ctx, cx - 16, startY - bubbleH, 32, bubbleH, 8, true, false);
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 1;
        roundRect(ctx, cx - 16, startY - bubbleH, 32, bubbleH, 8, false, true);

        ctx.font = '14px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < items.length; i++) {
            const emoji = PRODUCTS[items[i]].emoji;
            ctx.fillText(emoji, cx, startY - bubbleH + 10 + i * 14);
        }
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }

    // --- Customer ---
    function drawCustomer(customer) {
        const { x, y, color, hairColor, order, patience, maxPatience, served, queuePosition } = customer;
        const size = 24;
        const cx = x + size / 2;
        const cy = y + size / 2;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + size / 2 + 2, size / 2 - 3, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx, cy + 3, size / 2 - 2, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = '#FFCC80';
        ctx.beginPath();
        ctx.arc(cx, cy - 5, 7, 0, Math.PI * 2);
        ctx.fill();

        // Hair
        ctx.fillStyle = hairColor;
        ctx.beginPath();
        ctx.arc(cx, cy - 8, 6.5, Math.PI, 0);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(cx - 2.5, cy - 5, 1.2, 0, Math.PI * 2);
        ctx.arc(cx + 2.5, cy - 5, 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Expression based on patience
        const pRatio = patience / maxPatience;
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        if (served) {
            // Happy!
            ctx.beginPath();
            ctx.arc(cx, cy - 2, 3, 0.1, Math.PI - 0.1);
            ctx.stroke();
        } else if (pRatio < 0.25) {
            // Angry
            ctx.beginPath();
            ctx.arc(cx, cy, 3, Math.PI + 0.2, -0.2);
            ctx.stroke();
        } else if (pRatio < 0.5) {
            // Neutral
            ctx.beginPath();
            ctx.moveTo(cx - 3, cy - 2);
            ctx.lineTo(cx + 3, cy - 2);
            ctx.stroke();
        } else {
            // Happy
            ctx.beginPath();
            ctx.arc(cx, cy - 2, 2.5, 0.1, Math.PI - 0.1);
            ctx.stroke();
        }

        // Order bubble (above head)
        if (!served) {
            drawOrderBubble(customer);
        }

        // Patience bar (only first in queue)
        if (queuePosition === 0 && !served) {
            drawPatienceBar(cx, y - 8, pRatio, order);
        }
    }

    function drawOrderBubble(customer) {
        const { x, y, order } = customer;
        const cx = x + 12;

        // Count remaining items
        const remaining = order.filter(o => o.received < o.quantity);
        if (remaining.length === 0) return;

        const bubbleW = 50;
        const lineH = 14;
        const bubbleH = remaining.length * lineH + 8;
        const bx = cx - bubbleW / 2;
        const by = y - 16 - bubbleH;

        // Bubble
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        roundRect(ctx, bx, by, bubbleW, bubbleH, 8, true, false);
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 1;
        roundRect(ctx, bx, by, bubbleW, bubbleH, 8, false, true);

        // Pointer
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.beginPath();
        ctx.moveTo(cx - 4, by + bubbleH);
        ctx.lineTo(cx, by + bubbleH + 5);
        ctx.lineTo(cx + 4, by + bubbleH);
        ctx.closePath();
        ctx.fill();

        // Items
        ctx.font = '11px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        remaining.forEach((o, i) => {
            const rem = o.quantity - o.received;
            const emoji = PRODUCTS[o.item].emoji;
            ctx.fillStyle = '#333';
            ctx.fillText(`${emoji} x${rem}`, cx, by + 6 + i * lineH + lineH / 2);
        });
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }

    function drawPatienceBar(cx, y, ratio, order) {
        const w = 36, h = 5;
        const bx = cx - w / 2;

        // Count total order items for positioning
        const remaining = order.filter(o => o.received < o.quantity);
        const bubbleH = remaining.length * 14 + 8;
        const by = y - bubbleH - 10;

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        roundRect(ctx, bx, by, w, h, 2.5, true, false);

        // Fill
        const fillColor = ratio > 0.5 ? '#4CAF50' : ratio > 0.25 ? '#FF9800' : '#F44336';
        ctx.fillStyle = fillColor;
        roundRect(ctx, bx, by, w * Math.max(0, ratio), h, 2.5, true, false);

        // Border
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 0.5;
        roundRect(ctx, bx, by, w, h, 2.5, false, true);
    }

    // --- Floating Text ---
    function drawFloatingTexts(texts) {
        texts.forEach(ft => {
            ctx.save();
            ctx.globalAlpha = ft.opacity;
            ctx.font = `bold ${ft.size || 16}px "Segoe UI", sans-serif`;
            ctx.textAlign = 'center';

            // Outline
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth = 3;
            ctx.strokeText(ft.text, ft.x, ft.y);

            // Fill
            ctx.fillStyle = ft.color || '#4CAF50';
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        });
    }

    // --- Interaction hints ---
    function drawInteractionHint(x, y, text) {
        const pulse = Math.sin(frameCount * 0.08) * 0.15 + 0.85;
        ctx.save();
        ctx.globalAlpha = pulse * 0.9;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = 'bold 10px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';

        const tw = ctx.measureText(text).width + 12;
        roundRect(ctx, x - tw / 2, y - 8, tw, 16, 4, true, false);
        ctx.fillStyle = '#333';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y);
        ctx.restore();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }

    // --- Utility ---
    function roundRect(ctx, x, y, w, h, r, fill, stroke) {
        if (typeof r === 'number') {
            r = { tl: r, tr: r, bl: r, br: r };
        }
        ctx.beginPath();
        ctx.moveTo(x + r.tl, y);
        ctx.lineTo(x + w - r.tr, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr);
        ctx.lineTo(x + w, y + h - r.br);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
        ctx.lineTo(x + r.bl, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl);
        ctx.lineTo(x, y + r.tl);
        ctx.quadraticCurveTo(x, y, x + r.tl, y);
        ctx.closePath();
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
    }

    function tick() {
        frameCount++;
    }

    function getCtx() { return ctx; }
    function getCanvas() { return canvas; }
    function getFrame() { return frameCount; }

    return {
        init, tick, getCtx, getCanvas, getFrame,
        drawFloor, drawWalls, drawShelf, drawCashRegister, drawTrashCan,
        drawPlayer, drawCustomer, drawFloatingTexts, drawInteractionHint,
        roundRect,
    };
})();
