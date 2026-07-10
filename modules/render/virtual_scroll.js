// 虚拟滚动辅助工具
// 用于优化大列表渲染性能

export function createVirtualScroll(options) {
  const {
    container,
    itemHeight,
    bufferSize = 5,
    renderItem,
    getItemCount,
  } = options;

  let scrollTop = 0;
  let containerHeight = 0;
  let visibleStart = 0;
  let visibleEnd = 0;

  function updateDimensions() {
    if (!container) return;
    containerHeight = container.clientHeight;
    scrollTop = container.scrollTop;
  }

  function calculateVisibleRange() {
    const itemCount = getItemCount();
    if (itemCount === 0) return { start: 0, end: 0 };

    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(itemCount, start + visibleCount + bufferSize * 2);

    return { start, end };
  }

  function render() {
    updateDimensions();
    const { start, end } = calculateVisibleRange();
    
    if (start === visibleStart && end === visibleEnd) {
      return; // 没有变化，跳过渲染
    }

    visibleStart = start;
    visibleEnd = end;

    const itemCount = getItemCount();
    const totalHeight = itemCount * itemHeight;
    const offsetY = start * itemHeight;

    const items = [];
    for (let i = start; i < end; i++) {
      items.push(renderItem(i));
    }

    if (container) {
      container.innerHTML = `
        <div style="height: ${totalHeight}px; position: relative;">
          <div style="transform: translateY(${offsetY}px);">
            ${items.join('')}
          </div>
        </div>
      `;
    }
  }

  function handleScroll() {
    render();
  }

  function attach() {
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      updateDimensions();
      render();
    }
  }

  function detach() {
    if (container) {
      container.removeEventListener('scroll', handleScroll);
    }
  }

  return {
    render,
    attach,
    detach,
    updateDimensions,
  };
}

// 图片懒加载辅助工具
export function createLazyImageLoader(options = {}) {
  const {
    rootMargin = '50px',
    threshold = 0.01,
  } = options;

  let observer = null;

  function init() {
    if (typeof IntersectionObserver === 'undefined') {
      // 不支持 IntersectionObserver，直接加载所有图片
      return {
        observe: (img) => {
          if (img.dataset.src) {
            img.src = img.dataset.src;
            delete img.dataset.src;
          }
        },
        disconnect: () => {},
      };
    }

    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            delete img.dataset.src;
            observer.unobserve(img);
          }
        }
      });
    }, {
      rootMargin,
      threshold,
    });

    return {
      observe: (img) => {
        if (observer && img.dataset.src) {
          observer.observe(img);
        }
      },
      disconnect: () => {
        if (observer) {
          observer.disconnect();
          observer = null;
        }
      },
    };
  }

  return init();
}
