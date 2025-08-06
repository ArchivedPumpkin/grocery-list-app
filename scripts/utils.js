function setupSwipeWithHammer() {
    const swipeItems = document.querySelectorAll('.swipe-wrapper');

    swipeItems.forEach(wrapper => {
        const hammer = new Hammer(wrapper);

        hammer.on('swipeleft', () => {
            // Close others
            document.querySelectorAll('.swipe-wrapper.swiped').forEach(el => {
                if (el !== wrapper) el.classList.remove('swiped');
            });
            wrapper.classList.add('swiped');
        });

        hammer.on('swiperight', () => {
            wrapper.classList.remove('swiped');
        });
    });

    document.addEventListener('touchstart', (e) => {
        const isSwipe = e.target.closest('.swipe-wrapper');
        if (!isSwipe) {
            document.querySelectorAll('.swipe-wrapper.swiped')
                .forEach(el => el.classList.remove('swiped'));
        }
    });

}

function setupEllipsisRevealDelete(container) {
    container.querySelectorAll('.drag-handle').forEach(handle => {

        handle.addEventListener('click', (e) => {
            const swipeWrapper = handle.closest('.swipe-wrapper');
            if (!swipeWrapper) return;

            // If already swiped, toggle off
            if (swipeWrapper.classList.contains('swiped')) {
                swipeWrapper.classList.remove('swiped');
            } else {
                // Close all other swiped elements
                document.querySelectorAll('.swipe-wrapper.swiped').forEach(el => {
                    if (el !== swipeWrapper) el.classList.remove('swiped');
                });
                swipeWrapper.classList.add('swiped');
            }
            e.stopPropagation();
        });
    });
}

export { setupSwipeWithHammer, setupEllipsisRevealDelete };