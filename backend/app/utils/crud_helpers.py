from typing import Dict, List, Optional, TypeVar, Callable
from datetime import datetime
from pydantic import BaseModel
import uuid

T = TypeVar('T', bound=BaseModel)


def get_all_items(
    data_manager,
    data_file: str,
    collection_key: str,
    model_class: type[T]
) -> List[T]:
    """Generic get-all operation for any collection"""
    data = data_manager.read_data(data_file)
    return [model_class(**item) for item in data.get(collection_key, [])]


def get_item_by_id(
    data_manager,
    data_file: str,
    collection_key: str,
    item_id: str,
    model_class: type[T]
) -> Optional[T]:
    """Generic get-by-id operation for any collection"""
    data = data_manager.read_data(data_file)
    for item in data.get(collection_key, []):
        if item.get("id") == item_id:
            return model_class(**item)
    return None


def create_item(
    data_manager,
    data_file: str,
    collection_key: str,
    item: T,
    post_update: Optional[Callable[[Dict], None]] = None,
) -> T:
    """Generic create operation for any collection"""
    item.id = str(uuid.uuid4())
    item.created_at = datetime.now().isoformat()

    def mutate(data: Dict) -> T:
        data.setdefault(collection_key, []).append(item.model_dump())
        if post_update:
            post_update(data)
        return item

    return data_manager.update_data(data_file, mutate)


def update_item_by_id(
    data_manager,
    data_file: str,
    collection_key: str,
    item_id: str,
    item: T,
    model_class: type[T],
    post_update: Optional[Callable[[Dict], None]] = None,
) -> Optional[T]:
    """Generic update operation for any collection"""
    def mutate(data: Dict) -> Optional[T]:
        items = data.get(collection_key, [])
        for i, existing in enumerate(items):
            if existing.get("id") == item_id:
                item.id = item_id
                item.created_at = existing.get("created_at", datetime.now().isoformat())
                items[i] = item.model_dump()
                if post_update:
                    post_update(data)
                return item
        return None

    return data_manager.update_data(data_file, mutate, write_if=lambda result: result is not None)


def delete_item_by_id(
    data_manager,
    data_file: str,
    collection_key: str,
    item_id: str,
    post_update: Optional[Callable[[Dict], None]] = None,
) -> bool:
    """Generic delete operation for any collection"""
    def mutate(data: Dict) -> bool:
        items = data.get(collection_key, [])
        for i, existing in enumerate(items):
            if existing.get("id") == item_id:
                items.pop(i)
                if post_update:
                    post_update(data)
                return True
        return False

    return data_manager.update_data(data_file, mutate, write_if=bool)
