// src/components/core/dialog.jsx
// Motion-Primitives Dialog Component
import React, { createContext, useContext, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const DialogContext = createContext(null);

const defaultVariants = {
  initial: {
    opacity: 0,
    scale: 0.92,
    y: 8,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 8,
  },
};

const defaultTransition = {
  type: 'spring',
  damping: 25,
  stiffness: 300,
  duration: 0.22,
};

export function Dialog({
  children,
  variants = defaultVariants,
  transition = defaultTransition,
  defaultOpen = false,
  onOpenChange,
  open,
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isOpen = open !== undefined ? open : uncontrolledOpen;
  const baseId = useId();

  const setIsOpen = React.useCallback(
    (value) => {
      setUncontrolledOpen(value);
      onOpenChange?.(value);
    },
    [onOpenChange]
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => document.body.classList.remove('overflow-hidden');
  }, [isOpen]);

  const handleTrigger = () => {
    setIsOpen(true);
  };

  const ids = {
    dialog: `motion-ui-dialog-${baseId}`,
    title: `motion-ui-dialog-title-${baseId}`,
    description: `motion-ui-dialog-description-${baseId}`,
  };

  return (
    <DialogContext.Provider
      value={{
        isOpen,
        setIsOpen,
        variants,
        transition,
        ids,
        handleTrigger,
      }}
    >
      {children}
    </DialogContext.Provider>
  );
}

export function DialogTrigger({ children, className, asChild = false, ...props }) {
  const context = useContext(DialogContext);
  if (!context) throw new Error('DialogTrigger must be used within Dialog');

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: (e) => {
        children.props.onClick?.(e);
        context.handleTrigger();
      },
    });
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={context.handleTrigger}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}

export function DialogPortal({ children, container }) {
  if (typeof window === 'undefined') return null;
  return createPortal(children, container || document.body);
}

export function DialogContent({ children, className, container }) {
  const context = useContext(DialogContext);
  if (!context) throw new Error('DialogContent must be used within Dialog');
  const { isOpen, setIsOpen, variants, transition, ids } = context;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Animated Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Animated Panel */}
          <motion.div
            key={ids.dialog}
            id={ids.dialog}
            aria-labelledby={ids.title}
            aria-describedby={ids.description}
            aria-modal="true"
            role="dialog"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={variants}
            transition={transition}
            className={cn(
              'relative z-10 w-full max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-800 p-6 shadow-2xl text-slate-100',
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return <DialogPortal container={container}>{content}</DialogPortal>;
}

export function DialogHeader({ children, className }) {
  return (
    <div className={cn('flex flex-col space-y-1.5 pb-3 border-b border-white/5', className)}>
      {children}
    </div>
  );
}

export function DialogTitle({ children, className }) {
  const context = useContext(DialogContext);
  if (!context) throw new Error('DialogTitle must be used within Dialog');

  return (
    <h2 id={context.ids.title} className={cn('text-lg font-bold text-white', className)}>
      {children}
    </h2>
  );
}

export function DialogDescription({ children, className }) {
  const context = useContext(DialogContext);
  if (!context) throw new Error('DialogDescription must be used within Dialog');

  return (
    <p id={context.ids.description} className={cn('text-sm text-slate-400', className)}>
      {children}
    </p>
  );
}

export function DialogClose({ className, children, disabled }) {
  const context = useContext(DialogContext);
  if (!context) throw new Error('DialogClose must be used within Dialog');

  return (
    <button
      onClick={() => context.setIsOpen(false)}
      type="button"
      aria-label="Fechar"
      className={cn(
        'absolute top-4 right-4 rounded-lg p-1 text-slate-400 opacity-70 transition-all hover:text-white hover:bg-slate-700/50 hover:opacity-100 focus:outline-hidden disabled:pointer-events-none',
        className
      )}
      disabled={disabled}
    >
      {children || <X className="h-5 w-5" />}
      <span className="sr-only">Fechar</span>
    </button>
  );
}
