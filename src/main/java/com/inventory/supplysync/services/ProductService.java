package com.inventory.supplysync.services;

import com.inventory.supplysync.dto.ProductDTO;

import java.util.List;

public interface ProductService {

    ProductDTO createProduct(ProductDTO dto);

    ProductDTO getProductById(Long id);

    List<ProductDTO> getAllProducts();

    ProductDTO updateProduct(Long id, ProductDTO dto);

    void deleteProduct(Long id);

    List<ProductDTO> getProductsByCategory(String category);

    List<ProductDTO> searchByName(String name);

    List<ProductDTO> getLowStockProducts(Integer threshold);
}
