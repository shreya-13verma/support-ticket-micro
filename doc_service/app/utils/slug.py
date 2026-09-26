import re
import unicodedata
from typing import Callable, Awaitable, Optional


def slugify(value: str) -> str:
    """Normalize string, remove non-alpha characters, and convert spaces to hyphens."""
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^\w\s-]", "", value.lower().strip())
    value = re.sub(r"[-\s]+", "-", value)
    return value.strip("-") or "doc"


async def generate_unique_slug(
    base_text: str,
    exists_check_fn: Callable[[str], Awaitable[bool]],
    current_slug: Optional[str] = None
) -> str:
    """Generate a unique slug, appending incrementing numbers on collision."""
    base_slug = slugify(base_text)
    if current_slug and base_slug == current_slug:
        return current_slug

    candidate = base_slug
    counter = 1
    while await exists_check_fn(candidate):
        if current_slug and candidate == current_slug:
            return candidate
        candidate = f"{base_slug}-{counter}"
        counter += 1

    return candidate
