package com.hellenicdir.ui.businesses

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hellenicdir.core.network.ApiService
import com.hellenicdir.data.remote.dto.BusinessDto
import com.hellenicdir.data.remote.dto.PaginationMetaDto
import com.hellenicdir.ui.designsystem.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class BusinessUiState(
    val businesses: List<BusinessDto> = emptyList(),
    val meta: PaginationMetaDto? = null,
    val isLoading: Boolean = true,
    val error: String? = null
)

@HiltViewModel
class BusinessListViewModel @Inject constructor(private val api: ApiService) : ViewModel() {
    private val _state = MutableStateFlow(BusinessUiState())
    val state = _state.asStateFlow()

    var searchQuery = mutableStateOf("")
    var cityFilter = mutableStateOf("")
    var keywordFilter = mutableStateOf("")

    init { search() }

    fun search(page: Int = 1) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val result = api.getBusinesses(
                    search = searchQuery.value.ifBlank { null },
                    city = cityFilter.value.ifBlank { null },
                    keyword = keywordFilter.value.ifBlank { null },
                    page = page
                )
                _state.update { it.copy(businesses = result.data, meta = result.meta, isLoading = false) }
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }
}

@Composable
fun BusinessListScreen(viewModel: BusinessListViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current

    Column(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            HDSectionHeader("Greek Businesses")
            HDSearchBar(
                query = viewModel.searchQuery.value,
                onQueryChange = { viewModel.searchQuery.value = it },
                onSearch = { viewModel.search() }
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = viewModel.cityFilter.value,
                    onValueChange = { viewModel.cityFilter.value = it },
                    label = { Text("City") },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = HDGold, unfocusedBorderColor = HDMuted.copy(alpha = 0.3f))
                )
                OutlinedTextField(
                    value = viewModel.keywordFilter.value,
                    onValueChange = { viewModel.keywordFilter.value = it },
                    label = { Text("Category") },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = HDGold, unfocusedBorderColor = HDMuted.copy(alpha = 0.3f))
                )
            }
        }

        if (state.isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = HDGold) }
        } else {
            LazyColumn(contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items(state.businesses, key = { it.id }) { biz ->
                    HDCard(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                HDAvatar(imageUrl = biz.logoUrl, initials = biz.businessName.take(1), size = 44.dp)
                                Column {
                                    Text(biz.businessName, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
                                    Text(biz.contactName, style = MaterialTheme.typography.labelSmall, color = HDMuted)
                                }
                            }

                            biz.description?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface, maxLines = 2) }

                            // Keywords
                            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                biz.keywords.take(4).forEach { kw -> HDBadge(kw) }
                            }

                            // Actions
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Text(listOfNotNull(biz.city, biz.state).joinToString(", "), style = MaterialTheme.typography.labelSmall, color = HDMuted)
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    TextButton(onClick = { context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:${biz.phone}"))) }) {
                                        Text("Call", color = HDGold, style = MaterialTheme.typography.labelMedium)
                                    }
                                    TextButton(onClick = { context.startActivity(Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:${biz.email}"))) }) {
                                        Text("Email", color = HDGold, style = MaterialTheme.typography.labelMedium)
                                    }
                                    biz.website?.let { web ->
                                        TextButton(onClick = { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(web))) }) {
                                            Text("Web", color = HDGold, style = MaterialTheme.typography.labelMedium)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
