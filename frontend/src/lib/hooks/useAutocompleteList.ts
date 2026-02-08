import { useCallback, useEffect, useState } from "react";
import type { KeyboardEvent } from "react";

interface UseAutocompleteListOptions<T> {
  items: T[];
  onSelect: (item: T) => void;
}

interface UseAutocompleteListResult<T> {
  isOpen: boolean;
  activeIndex: number;
  open: () => void;
  close: () => void;
  setActiveIndex: (index: number) => void;
  handleKeyDown: (event: KeyboardEvent<HTMLElement>) => boolean;
  selectIndex: (index: number) => void;
}

/**
 * Shared keyboard/open state for listbox-style autocompletes.
 */
export function useAutocompleteList<T>({
  items,
  onSelect,
}: UseAutocompleteListOptions<T>): UseAutocompleteListResult<T> {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  useEffect(() => {
    if (items.length === 0) {
      setActiveIndex(-1);
      setIsOpen(false);
      return;
    }

    if (activeIndex >= items.length) {
      setActiveIndex(items.length - 1);
    }
  }, [activeIndex, items.length]);

  const open = useCallback(() => {
    if (items.length > 0) {
      setIsOpen(true);
    }
  }, [items.length]);

  const close = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
  }, []);

  const selectIndex = useCallback(
    (index: number) => {
      const item = items[index];
      if (!item) {
        return;
      }
      onSelect(item);
      close();
    },
    [close, items, onSelect],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>): boolean => {
      if (items.length === 0) {
        return false;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setIsOpen(true);
        setActiveIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
        return true;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setIsOpen(true);
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
        return true;
      }

      if (event.key === "Enter" && isOpen && activeIndex >= 0) {
        event.preventDefault();
        selectIndex(activeIndex);
        return true;
      }

      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        close();
        return true;
      }

      return false;
    },
    [activeIndex, close, isOpen, items.length, selectIndex],
  );

  return {
    isOpen,
    activeIndex,
    open,
    close,
    setActiveIndex,
    handleKeyDown,
    selectIndex,
  };
}
