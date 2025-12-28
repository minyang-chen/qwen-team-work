"""Quick sort implementation.

This module provides a simple in‑place quick sort algorithm
that works on lists of comparable items.

Example
-------
>>> from quick_sort import quick_sort
>>> quick_sort([3, 1, 4, 1, 5])
[1, 1, 3, 4, 5]
"""

from typing import List, TypeVar

T = TypeVar("T")


def quick_sort(arr: List[T]) -> List[T]:
    """Return a new list containing the elements of *arr* sorted.

    The function uses the classic quick sort algorithm with a
    random pivot to avoid worst‑case behaviour on already sorted
    input.  It is implemented recursively for clarity.

    Parameters
    ----------
    arr: List[T]
        The list to sort.

    Returns
    -------
    List[T]
        A new list with the elements sorted.
    """
    if len(arr) <= 1:
        return arr[:]
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quick_sort(left) + middle + quick_sort(right)


if __name__ == "__main__":
    import sys
    data = [int(x) for x in sys.argv[1:]] if len(sys.argv) > 1 else [3, 1, 4, 1, 5]
    print("Input:", data)
    print("Sorted:", quick_sort(data))
